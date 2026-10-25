"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { brand } from "@/lib/brand";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Copy,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Eye,
  FileChartColumn,
  Flame,
  Gauge,
  LayoutDashboard,
  ListFilter,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { RecordForm, titles } from "./forms";
import { PrivateFiles } from "./private-files";
import { GrowthChart, Distribution, RevenueChart } from "./charts";
import { Entry, Kind, currency, dateLabel } from "@/lib/schemas";
import { metrics, today } from "@/lib/metrics";
type User = { id: string; name: string; email: string; demo: boolean };
const nav = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["alunos", "Alunos", Users],
  ["treinos", "Treinos", Dumbbell],
  ["evolucao", "Evolução física", ChartNoAxesCombined],
  ["avaliacoes", "Avaliações", ClipboardCheck],
  ["agenda", "Agenda", CalendarDays],
  ["check-ins", "Check-ins", CheckCheck],
  ["financeiro", "Financeiro", Wallet],
  ["planos", "Planos e serviços", CreditCard],
  ["comunicacao", "Comunicação", MessageSquare],
  ["relatorios", "Relatórios", FileChartColumn],
  ["configuracoes", "Configurações", Settings2],
] as const;
const goals = [
  "Hipertrofia",
  "Emagrecimento",
  "Condicionamento",
  "Saúde e qualidade de vida",
  "Performance esportiva",
];
const pageInfo: Record<string, [string, string]> = {
  dashboard: [
    "Visão geral",
    "Sua operação em movimento. Cada detalhe, sob controle.",
  ],
  alunos: ["Seus alunos", "Pessoas, objetivos e histórias de evolução."],
  treinos: [
    "Treinos inteligentes",
    "Planeje com precisão. Acompanhe cada repetição.",
  ],
  evolucao: [
    "Evolução física",
    "Transforme registros em uma visão clara do progresso.",
  ],
  avaliacoes: [
    "Avaliações físicas",
    "Um histórico completo para decisões mais conscientes.",
  ],
  agenda: ["Sua agenda", "Seu tempo organizado. Seus alunos em movimento."],
  "check-ins": [
    "Check-ins",
    "Consistência é o que transforma planejamento em resultado.",
  ],
  financeiro: [
    "Gestão financeira",
    "A saúde do seu negócio, em uma visão completa.",
  ],
  planos: ["Planos e serviços", "Seu conhecimento transformado em valor."],
  comunicacao: [
    "Central de comunicação",
    "Acompanhamento próximo. Relações mais fortes.",
  ],
  relatorios: ["Relatórios", "Os números por trás da sua evolução."],
  configuracoes: ["Configurações", "Um espaço de trabalho do seu jeito."],
};
const monthLabel = (date = new Date()) =>
  date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
function Logo() {
  return (
    <div className="brand">
      <BrandMark />
      <div className="brand-wordmark">
        <strong>{brand.wordmark}</strong>
        <small>PERSONAL PERFORMANCE OS</small>
      </div>
    </div>
  );
}
function Avatar({ name, size = "normal" }: { name: string; size?: string }) {
  return (
    <span
      className={`avatar ${size}`}
      style={
        {
          "--avatar-hue": (name.charCodeAt(0) * 17) % 360,
        } as React.CSSProperties
      }
    >
      {name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  const green = ["Ativo", "Confirmado", "Recebido", "Concluído"].includes(
    String(children),
  );
  return (
    <span
      className={`badge ${green ? "green" : ["Inativo", "Cancelado", "Ausente"].includes(String(children)) ? "gray" : "orange"}`}
    >
      <i />
      {children}
    </span>
  );
}
function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({
  text = "Nenhum registro por aqui.",
  onAdd,
}: {
  text?: string;
  onAdd?: () => void;
}) {
  return (
    <div className="empty">
      <Activity size={28} />
      <h3>{text}</h3>
      <p>Novos registros aparecerão neste espaço.</p>
      {onAdd && (
        <Button size="sm" onClick={onAdd}>
          <Plus size={14} />
          Adicionar registro
        </Button>
      )}
    </div>
  );
}
export default function Workspace({
  page,
  studentId,
  initialUser,
}: {
  page: string;
  studentId?: string;
  initialUser: User | null;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [user, setUser] = useState(initialUser);
  const [records, setRecords] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [quick, setQuick] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [modal, setModal] = useState<{
    kind: Kind;
    entry?: Entry;
    studentId?: string;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [historyEntry, setHistoryEntry] = useState<Entry | null>(null);
  const [period, setPeriod] = useState("12 meses");
  const [compare, setCompare] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [goalFilter, setGoalFilter] = useState("Todos");
  const [tableSearch, setTableSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [tablePage, setTablePage] = useState(1);
  const [tab, setTab] = useState("Visão geral");
  const [selectedStudent, setSelectedStudent] = useState(studentId || "");
  const [calendarView, setCalendarView] = useState("Semana");
  const [calendarDate, setCalendarDate] = useState(today());
  const [reportStart, setReportStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
  );
  const [reportEnd, setReportEnd] = useState(today());
  const notify = (s: string) => setToast(s);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecords(data.records);
      setUser(data.user);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (initialUser) void load();
    else setLoading(false);
  }, [initialUser, load]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4200);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    setFilter("Todos");
    setTableSearch("");
    setTablePage(1);
    setTab("Visão geral");
    setMobile(false);
    const date = new Date();
    if (page === "evolucao") date.setMonth(date.getMonth() - 6);
    else date.setDate(1);
    setReportStart(date.toISOString().slice(0, 10));
    setReportEnd(today());
  }, [page]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuick(false);
        setNotifications(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const m = useMemo(() => metrics(records), [records]);
  const of = (kind: string) => records.filter((r) => r.kind === kind);
  const studentName = (id: string) =>
    m.students.find((s) => s.id === id)?.data.name || "Aluno indisponível";
  const open = (kind: Kind, entry?: Entry, id?: string) => {
    setModal({ kind, entry, studentId: id });
    setQuick(false);
  };
  const save = async (kind: Kind, data: any, id?: string) => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data, id }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    await load();
    notify("Registro salvo com sucesso.");
  };
  const update = async (entry: Entry, data: any) => {
    try {
      await save(entry.kind as Kind, { ...entry.data, ...data }, entry.id);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Falha ao atualizar");
    }
  };
  const exportCSV = (list: Entry[], name: string) => {
    const keys = [...new Set(list.flatMap((r) => Object.keys(r.data)))];
    const escape = (v: any) =>
      '"' +
      String(typeof v === "object" ? JSON.stringify(v) : (v ?? ""))
        .replaceAll('"', '""')
        .replace(/^[=+@-]/, "'$&") +
      '"';
    const csv =
      "\uFEFF" +
      [
        "id;" + keys.join(";"),
        ...list.map((r) =>
          [
            r.id,
            ...keys.map((k) =>
              k === "studentId" ? studentName(r.data[k]) : r.data[k],
            ),
          ]
            .map(escape)
            .join(";"),
        ),
      ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brand.exportPrefix}-${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Arquivo CSV exportado.");
  };
  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.assign("/login");
  };
  const studentList = m.students
    .filter(
      (r) =>
        (filter === "Todos" || r.data.status === filter) &&
        (goalFilter === "Todos" || r.data.goal === goalFilter) &&
        r.data.name.toLowerCase().includes(tableSearch.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.data.name.localeCompare(b.data.name)
        : b.createdAt.localeCompare(a.createdAt),
    );
  const appointments = of("appointment").sort((a, b) =>
    (a.data.date + a.data.time).localeCompare(b.data.date + b.data.time),
  );
  const alerts = m.active.flatMap((s) => {
    const workouts = of("workout")
      .filter((w) => w.data.studentId === s.id)
      .sort((a, b) => b.data.date.localeCompare(a.data.date));
    const last = workouts[0];
    const days = last
      ? Math.floor((Date.now() - new Date(last.data.date).getTime()) / 86400000)
      : 0;
    const assessments = of("assessment")
      .filter((a) => a.data.studentId === s.id)
      .sort((a, b) => b.data.date.localeCompare(a.data.date));
    const messages = [];
    if (days >= 7)
      messages.push({
        student: s,
        message: `Sem treinar há ${days} dias`,
        type: "frequency",
      });
    if (assessments[0]?.data.nextDate < today())
      messages.push({
        student: s,
        message: "Avaliação precisa ser atualizada",
        type: "assessment",
      });
    if (m.pending.some((p) => p.data.studentId === s.id))
      messages.push({
        student: s,
        message: "Pagamento em aberto",
        type: "payment",
      });
    return messages;
  });
  const adherence = (student: Entry, count: number) => {
    const plan = of("service").find((p) => p.data.name === student.data.plan);
    const weekly = Number(
      String(plan?.data.frequency || "").match(/^(\d+)x/)?.[1] || 0,
    );
    return weekly
      ? Math.min(
          100,
          Math.round(
            (count /
              (weekly *
                Math.ceil(
                  new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() + 1,
                    0,
                  ).getDate() / 7,
                ))) *
              100,
          ),
        )
      : null;
  };
  const ranking = m.active
    .map((s) => ({
      student: s,
      count: of("workout").filter(
        (w) =>
          w.data.studentId === s.id &&
          w.data.date.startsWith(today().slice(0, 7)),
      ).length,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const pageTitle = pageInfo[page]?.[0] || "Dashboard";
  const kpis = [
    {
      label: "Alunos ativos",
      value: String(m.active.length),
      icon: Users,
      detail: `${m.students.length} alunos cadastrados`,
      trend: `${m.active.filter((r) => r.createdAt.startsWith(today().slice(0, 7))).length} novos neste mês`,
      good: true,
    },
    {
      label: "Receita mensal",
      value: currency(m.received),
      icon: Wallet,
      detail: monthLabel(),
      trend: "Recebimentos confirmados",
      good: true,
    },
    {
      label: "Sessões da semana",
      value: String(m.appointments.length),
      icon: CalendarDays,
      detail: `${m.completed} realizadas · ${m.appointments.length - m.completed} restantes`,
      trend: "Sua agenda em dia",
      good: true,
    },
    {
      label: "Taxa de presença",
      value: `${m.presence}%`,
      icon: Target,
      detail: "Sessões concluídas / finalizadas",
      trend: "Semana atual",
      good: true,
    },
    {
      label: "Alunos em evolução",
      value: String(m.progress),
      icon: TrendingUp,
      detail: "Com avaliação registrada no mês",
      trend: `${m.active.length ? Math.round((m.progress / m.active.length) * 100) : 0}% da base ativa`,
      good: true,
    },
    {
      label: "Pagamentos pendentes",
      value: currency(m.pendingTotal),
      icon: CircleDollarSign,
      detail: `${m.pending.length} cobranças em aberto`,
      trend: "Acompanhar recebimentos",
      good: false,
    },
  ];
  const renderKpis = (items = kpis) => (
    <div className="kpi-grid">
      {items.map((k, i) => (
        <div className="kpi" key={k.label}>
          <div className="kpi-label">
            {k.label}
            <k.icon size={16} />
          </div>
          <div className="kpi-value">
            {k.value}
            {i === 1 && (
              <svg className="sparkline" viewBox="0 0 64 24">
                <path
                  d="M0 20 L8 17 L16 19 L24 9 L32 13 L40 7 L48 10 L56 3 L64 1"
                  fill="none"
                  stroke="#41C995"
                  strokeWidth="2"
                />
              </svg>
            )}
          </div>
          <div className={`kpi-trend ${k.good ? "positive" : "warning"}`}>
            {k.good ? <ArrowUpRight size={12} /> : <Clock3 size={12} />}{" "}
            {k.trend}
          </div>
          <small>{k.detail}</small>
        </div>
      ))}
    </div>
  );
  const growthData =
    period === "12 meses"
      ? m.growth
      : Array.from(
          { length: period === "7 dias" ? 7 : period === "30 dias" ? 30 : 90 },
          (_, i) => {
            const d = new Date();
            d.setDate(
              d.getDate() -
                (period === "7 dias" ? 6 : period === "30 dias" ? 29 : 89) +
                i,
            );
            return {
              label: d.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              }),
              value: m.active.filter((s) => new Date(s.createdAt) <= d).length,
              previous: m.active.filter(
                (s) =>
                  new Date(s.createdAt) <=
                  new Date(d.getTime() - 30 * 86400000),
              ).length,
            };
          },
        );
  const distribution = goals.map((name) => ({
    name,
    value: m.active.filter((s) => s.data.goal === name).length,
  }));
  const renderSessions = (list: Entry[], full = false) => (
    <div className="sessions">
      {list.length ? (
        list.slice(0, full ? 100 : 4).map((a) => (
          <div className="session" key={a.id}>
            <div className="session-time">
              {a.data.time}
              <small>{a.data.duration} min</small>
            </div>
            <Avatar name={studentName(a.data.studentId)} />
            <div className="session-person">
              <b>{studentName(a.data.studentId)}</b>
              <small>
                {a.data.type}
                {full ? ` · ${dateLabel(a.data.date)}` : ""}
              </small>
            </div>
            <div className="session-end">
              <Badge>{a.data.status}</Badge>
              <button
                className="icon-button"
                aria-label="Detalhes da sessão"
                onClick={() => open("appointment", a)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <Empty
          text="Nenhuma sessão neste período."
          onAdd={() => open("appointment")}
        />
      )}
    </div>
  );
  if (page === "login")
    return (
      <Login
        demoEnabled={process.env.NEXT_PUBLIC_DEMO_MODE === "true"}
        onSuccess={() => {
          window.location.assign("/");
        }}
      />
    );
  return (
    <div
      className={`app-shell ${collapsed ? "collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
    >
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className="sidebar">
        <Link
          href="/"
          className="brand-link"
          aria-label={`${brand.name} início`}
        >
          <Logo />
        </Link>
        <div className="workspace-label">
          <span>WORKSPACE</span>
          <span className="workspace-dot" />
        </div>
        <nav>
          {nav.map(([href, label, Icon], i) => (
            <div key={href}>
              {i === 7 && (
                <div className="nav-divider">
                  <span>GESTÃO DO NEGÓCIO</span>
                </div>
              )}
              <Link
                href={href === "dashboard" ? "/" : `/${href}`}
                title={collapsed ? label : undefined}
                className={`nav-link ${page === href ? "active" : ""}`}
              >
                <Icon size={18} />
                <span>{label}</span>
                {href === "alunos" && <small>{m.active.length}</small>}
                {href === "agenda" && <i className="nav-dot" />}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="pro-box">
            <div className="pro-icon">
              <Zap size={16} />
            </div>
            <div>
              <b>
                {user?.demo
                  ? `${brand.wordmark} DEMO`
                  : `${brand.wordmark} WORKSPACE`}
              </b>
              <small>
                {user?.demo
                  ? "Explore seu próximo nível"
                  : "Seu centro de performance"}
              </small>
            </div>
            <ShieldCheck size={15} />
          </div>
          <div className="personal">
            <Avatar name={user?.name || "Personal"} />
            <div>
              <b>{of("profile")[0]?.data.name || user?.name}</b>
              <small>Personal trainer</small>
            </div>
            <button className="icon-button" aria-label="Sair" onClick={logout}>
              <LogOut size={16} />
            </button>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <PanelLeftClose size={15} />
            <span>Recolher menu</span>
            <small>⌘ [</small>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menu"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <Link href="/">Workspace</Link>
            <ChevronRight size={12} />
            <span>{pageTitle}</span>
          </div>
          <div className="global-search">
            <Search size={16} />
            <input
              ref={searchRef}
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Buscar no seu workspace..."
              aria-label="Busca global"
            />
            <kbd>⌘ K</kbd>
            {searchOpen && (
              <div className="search-results">
                <div className="dropdown-label">
                  {query ? "RESULTADOS" : "NAVEGAR PARA"}
                  <button
                    className="icon-button"
                    onClick={() => setSearchOpen(false)}
                    aria-label="Fechar busca"
                  >
                    <X size={14} />
                  </button>
                </div>
                {nav
                  .filter(([, label]) =>
                    label.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map(([href, label, Icon]) => (
                    <Link
                      key={href}
                      href={href === "dashboard" ? "/" : `/${href}`}
                      onClick={() => setSearchOpen(false)}
                    >
                      <Icon size={16} />
                      {label}
                      <ChevronRight size={14} />
                    </Link>
                  ))}
                {m.students
                  .filter(
                    (s) =>
                      query &&
                      s.data.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .slice(0, 5)
                  .map((s) => (
                    <Link
                      key={s.id}
                      href={`/alunos/${s.id}`}
                      onClick={() => setSearchOpen(false)}
                    >
                      <Users size={16} />
                      {s.data.name}
                    </Link>
                  ))}
              </div>
            )}
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              <CalendarDays size={14} />
              {new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "America/Sao_Paulo",
              })}
            </span>
            <div className="dropdown-wrap">
              <button
                className="notification-button icon-button"
                aria-label="Notificações"
                onClick={() => {
                  setNotifications(!notifications);
                  setQuick(false);
                }}
              >
                <Bell size={18} />
                {alerts.length > 0 && <i />}
              </button>
              {notifications && (
                <div className="dropdown notifications">
                  <div className="dropdown-label">
                    CENTRAL DE ATENÇÃO <span>{alerts.length}</span>
                  </div>
                  {alerts.slice(0, 5).map((a, i) => (
                    <Link
                      key={i}
                      href={`/alunos/${a.student.id}`}
                      onClick={() => setNotifications(false)}
                    >
                      <span>
                        <b>{a.student.data.name}</b>
                        <small>{a.message}</small>
                      </span>
                      <ChevronRight size={14} />
                    </Link>
                  ))}
                  {!alerts.length && <p>Nenhum alerta pendente.</p>}
                </div>
              )}
            </div>
            <div className="dropdown-wrap">
              <Button
                size="sm"
                onClick={() => {
                  setQuick(!quick);
                  setNotifications(false);
                }}
              >
                <Plus size={16} />
                <span>Ação rápida</span>
                <ChevronDown size={13} />
              </Button>
              {quick && (
                <div className="dropdown">
                  {(
                    [
                      "student",
                      "training",
                      "appointment",
                      "payment",
                      "assessment",
                    ] as Kind[]
                  ).map((k) => (
                    <button key={k} onClick={() => open(k)}>
                      <Plus size={15} />
                      {k === "student"
                        ? "Cadastrar"
                        : k === "appointment"
                          ? "Agendar"
                          : "Registrar"}{" "}
                      {titles[k]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Avatar name={user?.name || "Personal"} size="small" />
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                SEU CENTRO DE COMANDO{" "}
                {user?.demo && <span>• DADOS DEMONSTRATIVOS</span>}
              </div>
              <h1>
                {pageTitle}
                <span className="heading-dot">.</span>
              </h1>
              <p>{pageInfo[page]?.[1]}</p>
            </div>
            <div className="page-actions">
              {page === "dashboard" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/relatorios")}
                  >
                    <ArrowDownToLine size={14} />
                    Relatórios
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push("/agenda")}
                  >
                    <CalendarDays size={14} />
                    Minha agenda
                    <ArrowUpRight size={14} />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportCSV(
                        records.filter(
                          (r) =>
                            r.kind ===
                            ({
                              alunos: "student",
                              treinos: "training",
                              avaliacoes: "assessment",
                              financeiro: "payment",
                              agenda: "appointment",
                              evolucao: "assessment",
                              "check-ins": "workout",
                              planos: "service",
                              comunicacao: "note",
                            }[page] || "activity"),
                        ),
                        page,
                      )
                    }
                  >
                    <ArrowDownToLine size={14} />
                    Exportar CSV
                  </Button>
                  {(
                    {
                      alunos: "student",
                      treinos: "training",
                      avaliacoes: "assessment",
                      agenda: "appointment",
                      "check-ins": "workout",
                      financeiro: "payment",
                      planos: "service",
                      comunicacao: "note",
                    } as Record<string, Kind>
                  )[page] && (
                    <Button
                      size="sm"
                      onClick={() =>
                        open(
                          (
                            {
                              alunos: "student",
                              treinos: "training",
                              avaliacoes: "assessment",
                              agenda: "appointment",
                              "check-ins": "workout",
                              financeiro: "payment",
                              planos: "service",
                              comunicacao: "note",
                            } as Record<string, Kind>
                          )[page],
                        )
                      }
                    >
                      <Plus size={14} />
                      Novo registro
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          {loadError ? (
            <div className="error-banner" role="alert">
              {loadError}
              <Button size="sm" onClick={() => void load()}>
                Tentar novamente
              </Button>
            </div>
          ) : loading ? (
            <div className="skeleton-grid">
              {Array.from({ length: 8 }, (_, i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          ) : (
            <motion.div
              key={page + studentId}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {page === "dashboard" && (
                <>
                  <section className="hero">
                    <div className="hero-image" />
                    <div className="hero-content">
                      <div className="hero-kicker">
                        <span />
                        PERFORMANCE É UM PROCESSO CONTÍNUO
                      </div>
                      <h2>
                        BEM-VINDO AO SEU
                        <br />
                        CENTRO DE <em>PERFORMANCE.</em>
                      </h2>
                      <p>
                        Cada aluno é uma evolução. Cada resultado é parte da sua
                        história.
                      </p>
                      <div className="hero-meta">
                        <span>
                          <Activity size={13} />
                          Seu negócio está em movimento
                        </span>
                        <i />
                        <span>
                          {new Date().toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="hero-stat">
                      <span>FOCO NO QUE IMPORTA</span>
                      <b>
                        EVOLUIR
                        <span>
                          <ArrowUpRight size={42} />
                        </span>
                      </b>
                      <small>Um aluno. Um treino. Um resultado.</small>
                    </div>
                    <div className="hero-index">{brand.wordmark} / 001</div>
                  </section>
                  <div className="section-caption">
                    <span>SEU NEGÓCIO EM NÚMEROS</span>
                    <span>
                      <i className="live-dot" />
                      Atualizado agora
                    </span>
                  </div>
                  {renderKpis()}
                  <div className="dashboard-grid">
                    <Panel
                      title="Evolução do negócio"
                      subtitle="Crescimento da sua base de alunos ativos"
                      className="growth-panel"
                      action={
                        <div className="segment-control">
                          {["7 dias", "30 dias", "90 dias", "12 meses"].map(
                            (p) => (
                              <button
                                key={p}
                                className={period === p ? "selected" : ""}
                                onClick={() => setPeriod(p)}
                              >
                                {p}
                              </button>
                            ),
                          )}
                        </div>
                      }
                    >
                      <div className="chart-summary">
                        <b>
                          {m.active.length}
                          <span>alunos ativos</span>
                        </b>
                        <label className="compare">
                          <input
                            type="checkbox"
                            checked={compare}
                            onChange={(e) => setCompare(e.target.checked)}
                          />
                          Comparar período anterior
                        </label>
                      </div>
                      <GrowthChart data={growthData} compare={compare} />
                      <div className="chart-footer">
                        <span>
                          <i className="legend-dot orange-bg" />
                          Alunos ativos
                        </span>
                        <span>
                          Dados do seu workspace <ArrowUpRight size={12} />
                        </span>
                      </div>
                    </Panel>
                    <Panel
                      title="Perfil dos alunos"
                      subtitle="Cada objetivo, uma direção"
                      className="distribution-panel"
                      action={<Target size={17} className="muted" />}
                    >
                      <Distribution data={distribution} />
                    </Panel>
                    <Panel
                      title="Receita mensal"
                      subtitle="Clareza para planejar o próximo passo"
                      className="revenue-panel"
                      action={
                        <Link className="text-link" href="/financeiro">
                          Ver financeiro
                          <ArrowUpRight size={13} />
                        </Link>
                      }
                    >
                      <div className="revenue-summary">
                        <b>{currency(m.received)}</b>
                        <span>
                          recebidos em{" "}
                          {new Date().toLocaleDateString("pt-BR", {
                            month: "long",
                          })}
                        </span>
                      </div>
                      <RevenueChart data={m.revenue} />
                      <div className="chart-footer revenue-legend">
                        <span>
                          <i className="legend-dot blue-bg" />
                          Recebida
                        </span>
                        <span>
                          <i
                            className="legend-dot"
                            style={{ background: "#354956" }}
                          />
                          Prevista
                        </span>
                        <span>
                          <i className="legend-dot orange-bg" />
                          Pendente
                        </span>
                      </div>
                    </Panel>
                    <Panel
                      title="Próximas sessões"
                      subtitle="Conexões que geram resultados"
                      className="sessions-panel"
                      action={
                        <Link className="text-link" href="/agenda">
                          Ver agenda
                          <ArrowUpRight size={13} />
                        </Link>
                      }
                    >
                      <div className="today-strip">
                        <CalendarDays size={14} />
                        <b>
                          {appointments.find(
                            (a) =>
                              a.data.date >= today() &&
                              !["Concluído", "Cancelado"].includes(
                                a.data.status,
                              ),
                          )?.data.date === today()
                            ? "Hoje"
                            : "Próximos dias"}
                        </b>
                        <span>
                          {new Date().toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                          })}
                        </span>
                      </div>
                      {renderSessions(
                        appointments.filter(
                          (a) =>
                            a.data.date >= today() &&
                            !["Concluído", "Cancelado", "Ausente"].includes(
                              a.data.status,
                            ),
                        ),
                      )}
                      <Link href="/agenda" className="panel-bottom-link">
                        Abrir agenda completa
                        <ArrowRight size={14} />
                      </Link>
                    </Panel>
                  </div>
                  <div className="dashboard-bottom">
                    <Panel
                      title="Um olhar de atenção"
                      subtitle="Pequenas ações fazem grandes diferenças"
                      action={
                        <span className="count-pill">
                          {alerts.length} alertas
                        </span>
                      }
                    >
                      {alerts.slice(0, 3).map((a, i) => (
                        <div className="attention-row" key={i}>
                          <div
                            className={`attention-icon ${a.type === "payment" ? "blue" : "orange"}`}
                          >
                            {a.type === "payment" ? (
                              <Wallet size={15} />
                            ) : a.type === "assessment" ? (
                              <ClipboardCheck size={15} />
                            ) : (
                              <Clock3 size={15} />
                            )}
                          </div>
                          <div>
                            <b>{a.student.data.name}</b>
                            <small>{a.message}</small>
                          </div>
                          <Link
                            href={`/alunos/${a.student.id}`}
                            className="icon-button"
                            aria-label={`Acompanhar ${a.student.data.name}`}
                          >
                            <ArrowUpRight size={16} />
                          </Link>
                        </div>
                      ))}
                      {!alerts.length && (
                        <Empty text="Tudo em dia com seus alunos." />
                      )}
                      <Link href="/alunos" className="panel-bottom-link">
                        Ver acompanhamento
                        <ArrowRight size={14} />
                      </Link>
                    </Panel>
                    <Panel
                      title="Consistência em destaque"
                      subtitle="Quem está fazendo acontecer neste mês"
                      action={<Trophy size={17} className="gold" />}
                    >
                      {ranking.map((r, i) => (
                        <Link
                          className="ranking-row"
                          href={`/alunos/${r.student.id}`}
                          key={r.student.id}
                        >
                          <span className={`rank ${i === 0 ? "first" : ""}`}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <Avatar name={r.student.data.name} size="small" />
                          <div>
                            <b>{r.student.data.name}</b>
                            <small>{r.count} treinos concluídos</small>
                          </div>
                          <div className="rank-bar">
                            <span
                              style={{
                                width: `${adherence(r.student, r.count) ?? 0}%`,
                              }}
                            />
                          </div>
                          <span
                            className="adherence-value"
                            title="Treinos concluídos / meta mensal do plano"
                          >
                            {adherence(r.student, r.count) !== null ? (
                              `${adherence(r.student, r.count)}%`
                            ) : (
                              <Flame size={14} className="orange" />
                            )}
                          </span>
                        </Link>
                      ))}
                      {!ranking.length && (
                        <Empty text="Os primeiros check-ins começam aqui." />
                      )}
                    </Panel>
                    <Panel
                      title="Aconteceu por aqui"
                      subtitle="Sua operação em tempo real"
                      action={<Activity size={17} className="muted" />}
                    >
                      <div className="timeline">
                        {of("activity")
                          .slice(-4)
                          .reverse()
                          .map((a, i) => (
                            <div key={a.id}>
                              <span className={`timeline-dot dot-${i}`} />
                              <div>
                                <b>{a.data.message}</b>
                                <small>
                                  {new Date(a.createdAt).toLocaleString(
                                    "pt-BR",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </small>
                              </div>
                            </div>
                          ))}
                      </div>
                    </Panel>
                  </div>
                </>
              )}
              {page === "alunos" && !studentId && (
                <>
                  {renderKpis([
                    kpis[0],
                    {
                      ...kpis[0],
                      label: "Alunos inativos",
                      value: String(m.students.length - m.active.length),
                      detail: "Acompanhamentos arquivados",
                      trend: "Histórico preservado",
                    },
                    {
                      ...kpis[4],
                      label: "Avaliações pendentes",
                      value: String(
                        alerts.filter((a) => a.type === "assessment").length,
                      ),
                    },
                    {
                      ...kpis[5],
                      label: "Com pendências",
                      value: String(
                        new Set(alerts.map((a) => a.student.id)).size,
                      ),
                    },
                  ])}
                  <Panel
                    title="Sua comunidade de evolução"
                    subtitle={`${studentList.length} alunos encontrados`}
                  >
                    <div className="table-toolbar">
                      <div className="input-icon">
                        <Search size={16} />
                        <input
                          placeholder="Buscar aluno pelo nome..."
                          value={tableSearch}
                          onChange={(e) => {
                            setTableSearch(e.target.value);
                            setTablePage(1);
                          }}
                        />
                      </div>
                      <select
                        aria-label="Filtrar status"
                        value={filter}
                        onChange={(e) => {
                          setFilter(e.target.value);
                          setTablePage(1);
                        }}
                      >
                        {["Todos", "Ativo", "Inativo"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Filtrar objetivo"
                        value={goalFilter}
                        onChange={(e) => {
                          setGoalFilter(e.target.value);
                          setTablePage(1);
                        }}
                      >
                        {["Todos", ...goals].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Ordenação"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="name">Nome A–Z</option>
                        <option value="recent">Mais recentes</option>
                      </select>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            {[
                              "Aluno",
                              "Objetivo",
                              "Plano",
                              "Frequência",
                              "Último treino",
                              "Status",
                              "Próxima avaliação",
                              "Ações",
                            ].map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {studentList
                            .slice((tablePage - 1) * 8, tablePage * 8)
                            .map((s) => {
                              const last = of("workout")
                                .filter((w) => w.data.studentId === s.id)
                                .sort((a, b) =>
                                  b.data.date.localeCompare(a.data.date),
                                )[0];
                              const assessment = of("assessment")
                                .filter((w) => w.data.studentId === s.id)
                                .sort((a, b) =>
                                  b.data.date.localeCompare(a.data.date),
                                )[0];
                              return (
                                <tr key={s.id}>
                                  <td>
                                    <Link
                                      className="person-cell"
                                      href={`/alunos/${s.id}`}
                                    >
                                      <Avatar name={s.data.name} />
                                      <div>
                                        <b>{s.data.name}</b>
                                        <small>
                                          {s.data.email || "Sem e-mail"}
                                        </small>
                                      </div>
                                    </Link>
                                  </td>
                                  <td>{s.data.goal}</td>
                                  <td>{s.data.plan || "Sem plano"}</td>
                                  <td>
                                    {
                                      of("workout").filter(
                                        (w) =>
                                          w.data.studentId === s.id &&
                                          w.data.date.startsWith(
                                            today().slice(0, 7),
                                          ),
                                      ).length
                                    }{" "}
                                    treinos / mês
                                  </td>
                                  <td>
                                    {last
                                      ? dateLabel(last.data.date)
                                      : "Sem registro"}
                                  </td>
                                  <td>
                                    <Badge>{s.data.status}</Badge>
                                  </td>
                                  <td>
                                    {assessment
                                      ? dateLabel(assessment.data.nextDate)
                                      : "Não agendada"}
                                  </td>
                                  <td>
                                    <div className="row-actions">
                                      <button
                                        className="icon-button"
                                        title="Editar aluno"
                                        onClick={() => open("student", s)}
                                      >
                                        <Settings2 size={15} />
                                      </button>
                                      <button
                                        className="icon-button"
                                        title={
                                          s.data.status === "Ativo"
                                            ? "Arquivar aluno"
                                            : "Reativar aluno"
                                        }
                                        onClick={() =>
                                          void update(s, {
                                            status:
                                              s.data.status === "Ativo"
                                                ? "Inativo"
                                                : "Ativo",
                                          })
                                        }
                                      >
                                        <samp>
                                          {s.data.status === "Ativo" ? (
                                            <ArrowDownLeft size={15} />
                                          ) : (
                                            <ArrowUpRight size={15} />
                                          )}
                                        </samp>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                      {!studentList.length && (
                        <Empty
                          text="Nenhum aluno encontrado."
                          onAdd={() => open("student")}
                        />
                      )}
                    </div>
                    <div className="pagination">
                      <span>
                        Página {tablePage} de{" "}
                        {Math.max(1, Math.ceil(studentList.length / 8))} ·{" "}
                        {studentList.length} alunos
                      </span>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={tablePage <= 1}
                          onClick={() => setTablePage((p) => p - 1)}
                        >
                          <ChevronLeft size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={tablePage * 8 >= studentList.length}
                          onClick={() => setTablePage((p) => p + 1)}
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  </Panel>
                </>
              )}
              {page === "alunos" &&
                studentId &&
                (() => {
                  const s = m.students.find((r) => r.id === studentId);
                  if (!s) return <Empty text="Aluno não encontrado." />;
                  const related = records.filter(
                    (r) => r.data.studentId === s.id,
                  );
                  const assessments = related
                    .filter((r) => r.kind === "assessment")
                    .sort((a, b) => a.data.date.localeCompare(b.data.date));
                  return (
                    <>
                      <div className="profile-hero">
                        <Avatar name={s.data.name} size="large" />
                        <div>
                          <Badge>{s.data.status}</Badge>
                          <h2>{s.data.name}</h2>
                          <p>
                            {s.data.goal} · {s.data.plan || "Sem plano"}
                          </p>
                          <small>
                            {s.data.email} {s.data.phone && `· ${s.data.phone}`}
                          </small>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => open("student", s)}
                        >
                          <Settings2 size={15} />
                          Editar aluno
                        </Button>
                      </div>
                      <div className="tabs">
                        {[
                          "Visão geral",
                          "Treinos",
                          "Evolução",
                          "Avaliações",
                          "Agenda",
                          "Financeiro",
                          "Anotações",
                        ].map((t) => (
                          <button
                            className={tab === t ? "active" : ""}
                            key={t}
                            onClick={() => setTab(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      {tab === "Visão geral" && (
                        <div className="two-columns">
                          <Panel
                            title="Acompanhamento individual"
                            subtitle="Informações privadas do profissional"
                          >
                            <div className="detail-metrics">
                              <div>
                                <small>Treinos concluídos</small>
                                <b>
                                  {
                                    related.filter((r) => r.kind === "workout")
                                      .length
                                  }
                                </b>
                              </div>
                              <div>
                                <small>Avaliações</small>
                                <b>{assessments.length}</b>
                              </div>
                              <div>
                                <small>Último peso registrado</small>
                                <b>
                                  {assessments.at(-1)?.data.weight || "—"}{" "}
                                  <small>kg</small>
                                </b>
                              </div>
                            </div>
                            <p className="padded muted">
                              {s.data.notes || "Nenhuma observação cadastrada."}
                            </p>
                            <div className="padded">
                              <Button
                                size="sm"
                                onClick={() => open("workout", undefined, s.id)}
                              >
                                <CheckCheck size={15} />
                                Registrar presença
                              </Button>
                            </div>
                          </Panel>
                          <Panel title="Histórico recente">
                            <div className="timeline">
                              {related
                                .slice(-8)
                                .reverse()
                                .map((r) => (
                                  <div key={r.id}>
                                    <span className="timeline-dot" />
                                    <div>
                                      <b>
                                        {titles[r.kind as Kind] || r.kind} ·{" "}
                                        {r.data.name ||
                                          r.data.status ||
                                          r.data.date ||
                                          "Registro"}
                                      </b>
                                      <small>
                                        {new Date(r.createdAt).toLocaleString(
                                          "pt-BR",
                                        )}
                                      </small>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </Panel>
                        </div>
                      )}
                      {tab === "Evolução" && (
                        <Panel
                          title="Evolução do peso"
                          subtitle="Histórico das medidas informadas pelo profissional"
                        >
                          <GrowthChart
                            data={assessments.map((a) => ({
                              label: dateLabel(a.data.date),
                              value: a.data.weight,
                            }))}
                            unit="kg"
                          />
                        </Panel>
                      )}
                      {tab === "Avaliações" && (
                        <Panel title="Anexos do acompanhamento">
                          <PrivateFiles studentId={s.id} type="document" />
                        </Panel>
                      )}
                      {!["Visão geral", "Evolução"].includes(tab) &&
                        renderRecords(
                          related.filter(
                            (r) =>
                              r.kind ===
                              {
                                Treinos: "training",
                                Avaliações: "assessment",
                                Agenda: "appointment",
                                Financeiro: "payment",
                                Anotações: "note",
                              }[tab],
                          ),
                          (
                            {
                              Treinos: "training",
                              Avaliações: "assessment",
                              Agenda: "appointment",
                              Financeiro: "payment",
                              Anotações: "note",
                            } as Record<string, Kind>
                          )[tab],
                          s.id,
                        )}
                    </>
                  );
                })()}
              {page === "treinos" && (
                <>
                  <div className="table-toolbar standalone">
                    <div className="input-icon">
                      <Search size={16} />
                      <input
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Buscar fichas ou exercícios..."
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTab(tab === "Biblioteca" ? "Fichas" : "Biblioteca")
                      }
                    >
                      <Dumbbell size={15} />
                      {tab === "Biblioteca"
                        ? "Ver fichas"
                        : "Biblioteca de exercícios"}
                    </Button>
                  </div>
                  {tab === "Biblioteca" ? (
                    <ExerciseLibrary query={tableSearch} />
                  ) : (
                    <div className="record-grid">
                      {of("training")
                        .filter((t) =>
                          (
                            t.data.name +
                            studentName(t.data.studentId) +
                            JSON.stringify(t.data.exercises)
                          )
                            .toLowerCase()
                            .includes(tableSearch.toLowerCase()),
                        )
                        .map((t) => (
                          <Panel
                            key={t.id}
                            title={t.data.name}
                            subtitle={studentName(t.data.studentId)}
                            action={
                              <span className="division">
                                {t.data.division}
                              </span>
                            }
                          >
                            <div className="training-exercises">
                              {t.data.exercises.map((ex: any, i: number) => (
                                <div key={i}>
                                  <span>{String(i + 1).padStart(2, "0")}</span>
                                  <div>
                                    <b>{ex.name}</b>
                                    <small>
                                      {ex.sets} séries × {ex.reps} · {ex.load}{" "}
                                      kg · {ex.rest}s descanso
                                    </small>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="card-actions">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => open("training", t)}
                              >
                                Editar ficha
                              </Button>
                              <button
                                className="icon-button"
                                aria-label="Histórico de progressão"
                                onClick={() => setHistoryEntry(t)}
                              >
                                <Clock3 size={15} />
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  open("training", {
                                    ...t,
                                    id: "",
                                    data: {
                                      ...t.data,
                                      name: t.data.name + " · cópia",
                                    },
                                  })
                                }
                              >
                                <Copy size={14} />
                                Duplicar
                              </Button>
                            </div>
                          </Panel>
                        ))}
                    </div>
                  )}
                  {!of("training").length && (
                    <Empty
                      text="Crie a primeira ficha de treino."
                      onAdd={() => open("training")}
                    />
                  )}
                </>
              )}
              {page === "evolucao" && (
                <>
                  <div className="table-toolbar standalone">
                    <label>
                      Aluno{" "}
                      <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                      >
                        {m.students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.data.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      De{" "}
                      <input
                        type="date"
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                      />
                    </label>
                    <label>
                      Até{" "}
                      <input
                        type="date"
                        value={reportEnd}
                        onChange={(e) => setReportEnd(e.target.value)}
                      />
                    </label>
                    <Button
                      size="sm"
                      onClick={() =>
                        open(
                          "assessment",
                          undefined,
                          selectedStudent || m.students[0]?.id,
                        )
                      }
                    >
                      <Plus size={14} />
                      Nova medida
                    </Button>
                  </div>
                  {(() => {
                    const id = selectedStudent || m.students[0]?.id;
                    const list = of("assessment")
                      .filter(
                        (a) =>
                          a.data.studentId === id &&
                          a.data.date >= reportStart &&
                          a.data.date <= reportEnd,
                      )
                      .sort((a, b) => a.data.date.localeCompare(b.data.date));
                    return (
                      <>
                        <div className="two-columns">
                          {[
                            ["weight", "Evolução do peso", "kg"],
                            ["waist", "Circunferência da cintura", "cm"],
                            ["fat", "Percentual de gordura informado", "%"],
                            ["chest", "Medida do tórax", "cm"],
                          ].map(([key, label, unit]) => (
                            <Panel
                              key={key}
                              title={label}
                              subtitle={`${list.length} registros no período`}
                            >
                              {list.length ? (
                                <GrowthChart
                                  data={list.map((a) => ({
                                    label: dateLabel(a.data.date),
                                    value: a.data[key],
                                  }))}
                                  unit={unit}
                                />
                              ) : (
                                <Empty text="Sem medidas neste período." />
                              )}
                            </Panel>
                          ))}
                        </div>
                        <Panel
                          title="Registros de evolução"
                          subtitle="Medidas informadas, sem diagnósticos automáticos"
                        >
                          {renderRecords(list, "assessment", id)}
                        </Panel>
                        <Panel
                          title="Comparação fotográfica"
                          subtitle="Privacidade e consentimento em primeiro lugar"
                        >
                          <PrivateFiles studentId={id || ""} />
                        </Panel>
                      </>
                    );
                  })()}
                </>
              )}
              {page === "avaliacoes" && (
                <>
                  <div className="table-toolbar standalone">
                    <div className="input-icon">
                      <Search size={16} />
                      <input
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Buscar aluno..."
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                    >
                      <ArrowDownToLine size={14} />
                      Imprimir / PDF
                    </Button>
                    <span className="muted">
                      <ShieldCheck size={13} /> Dados privados do profissional
                    </span>
                  </div>
                  {renderRecords(
                    of("assessment")
                      .filter((a) =>
                        studentName(a.data.studentId)
                          .toLowerCase()
                          .includes(tableSearch.toLowerCase()),
                      )
                      .sort((a, b) => b.data.date.localeCompare(a.data.date)),
                    "assessment",
                  )}
                </>
              )}
              {page === "agenda" && (
                <>
                  <Panel
                    title={new Date(
                      calendarDate + "T12:00:00",
                    ).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                    subtitle="Horários no fuso local do profissional"
                    action={
                      <div className="segment-control">
                        {["Dia", "Semana", "Mês"].map((t) => (
                          <button
                            key={t}
                            className={calendarView === t ? "selected" : ""}
                            onClick={() => setCalendarView(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    }
                  >
                    <div className="calendar-toolbar">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveCalendar(-1)}
                        aria-label="Período anterior"
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCalendarDate(today())}
                      >
                        Hoje
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveCalendar(1)}
                        aria-label="Próximo período"
                      >
                        <ChevronRight size={16} />
                      </Button>
                      <input
                        type="date"
                        aria-label="Data da agenda"
                        value={calendarDate}
                        onChange={(e) => setCalendarDate(e.target.value)}
                      />
                      <select
                        aria-label="Filtrar atendimento"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        {[
                          "Todos",
                          "Musculação",
                          "Funcional",
                          "Avaliação física",
                          "Consultoria online",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div
                      className={`calendar-grid ${calendarView === "Mês" ? "month-view" : calendarView === "Dia" ? "day-view" : ""}`}
                    >
                      {calendarDays().map((d) => {
                        const list = appointments.filter(
                          (a) =>
                            a.data.date === d &&
                            (filter === "Todos" || a.data.type === filter),
                        );
                        return (
                          <div
                            key={d}
                            className={`calendar-day ${d === today() ? "is-today" : ""}`}
                          >
                            <div className="calendar-day-label">
                              <span>
                                {new Date(d + "T12:00:00").toLocaleDateString(
                                  "pt-BR",
                                  { weekday: "short" },
                                )}
                              </span>
                              <b>{Number(d.slice(-2))}</b>
                              <button
                                aria-label={`Agendar em ${dateLabel(d)}`}
                                className="icon-button"
                                onClick={() =>
                                  open("appointment", {
                                    id: "",
                                    kind: "appointment",
                                    createdAt: "",
                                    updatedAt: "",
                                    data: {
                                      studentId: "",
                                      date: d,
                                      time: "09:00",
                                      duration: 60,
                                      type: "Musculação",
                                      status: "Confirmado",
                                      notes: "",
                                    },
                                  })
                                }
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            {list.map((a) => (
                              <button
                                key={a.id}
                                className={`calendar-event ${a.data.status === "Concluído" ? "done" : a.data.type === "Avaliação física" ? "evaluation" : ""}`}
                                onClick={() => open("appointment", a)}
                              >
                                <strong>
                                  {a.data.time}
                                  <span>{a.data.duration} min</span>
                                </strong>
                                <b>{studentName(a.data.studentId)}</b>
                                <small>{a.data.type}</small>
                                <small>{a.data.status}</small>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </>
              )}
              {page === "check-ins" && (
                <>
                  <div className="two-columns">
                    <Panel
                      title="Consistência do mês"
                      subtitle="Treinos registrados no período"
                    >
                      <div className="consistency-list">
                        {ranking.map((r, i) => (
                          <div key={r.student.id}>
                            <span className="rank first">{i + 1}</span>
                            <Avatar name={r.student.data.name} />
                            <b>{r.student.data.name}</b>
                            <span>{r.count} treinos</span>
                          </div>
                        ))}
                      </div>
                    </Panel>
                    <Panel
                      title="Presença nas sessões"
                      subtitle="Somente sessões com resultado registrado"
                    >
                      <div className="big-stat">
                        {m.presence}
                        <span>%</span>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${m.presence}%` }} />
                      </div>
                      <p className="padded muted">
                        {m.completed} sessões concluídas nesta semana.
                      </p>
                    </Panel>
                  </div>
                  {renderRecords(
                    of("workout").sort((a, b) =>
                      b.data.date.localeCompare(a.data.date),
                    ),
                    "workout",
                  )}
                </>
              )}
              {page === "financeiro" && (
                <>
                  {renderKpis([
                    kpis[1],
                    {
                      ...kpis[1],
                      label: "Receita prevista",
                      value: currency(
                        m.received +
                          m.pending
                            .filter((r) =>
                              r.data.dueDate.startsWith(today().slice(0, 7)),
                            )
                            .reduce((s, r) => s + r.data.amount, 0),
                      ),
                      trend: "Recebida + pendente no mês",
                    },
                    kpis[5],
                    {
                      ...kpis[1],
                      label: "Ticket médio",
                      value: currency(
                        m.active.length ? m.received / m.active.length : 0,
                      ),
                      detail: "Receita mensal / alunos ativos",
                      trend: "Base ativa",
                    },
                  ])}
                  <div className="two-columns">
                    <Panel
                      title="Receita e previsibilidade"
                      subtitle="Lançamentos manuais por competência"
                    >
                      <RevenueChart data={m.revenue} />
                    </Panel>
                    <Panel
                      title="Distribuição por serviço"
                      subtitle="Recebimentos cadastrados"
                    >
                      <Distribution
                        data={of("service").map((s) => ({
                          name: s.data.name,
                          value: of("payment")
                            .filter(
                              (p) =>
                                p.data.service === s.data.name &&
                                p.data.status === "Recebido",
                            )
                            .reduce((a, p) => a + p.data.amount, 0),
                        }))}
                      />
                    </Panel>
                  </div>
                  <div className="table-toolbar standalone">
                    <div className="input-icon">
                      <Search size={16} />
                      <input
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Buscar aluno ou serviço..."
                      />
                    </div>
                    <select
                      aria-label="Status do pagamento"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {["Todos", "Recebido", "Pendente"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <label>
                      De
                      <input
                        type="date"
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                      />
                    </label>
                    <label>
                      Até
                      <input
                        type="date"
                        value={reportEnd}
                        onChange={(e) => setReportEnd(e.target.value)}
                      />
                    </label>
                  </div>
                  {renderRecords(
                    of("payment").filter(
                      (p) =>
                        (filter === "Todos" || p.data.status === filter) &&
                        (studentName(p.data.studentId) + p.data.service)
                          .toLowerCase()
                          .includes(tableSearch.toLowerCase()) &&
                        p.data.dueDate >= reportStart &&
                        p.data.dueDate <= reportEnd,
                    ),
                    "payment",
                  )}
                </>
              )}
              {page === "planos" && (
                <div className="record-grid plans-grid">
                  {of("service").map((s, i) => (
                    <Panel
                      key={s.id}
                      title={s.data.name}
                      subtitle={s.data.description}
                      action={<span className="plan-index">0{i + 1}</span>}
                    >
                      <div className="plan-price">
                        {currency(s.data.price)}
                        <small>/{s.data.duration.toLowerCase()}</small>
                      </div>
                      <div className="plan-features">
                        <p>
                          <Check size={15} />
                          {s.data.frequency}
                        </p>
                        <p>
                          <Users size={15} />
                          {
                            m.active.filter((a) => a.data.plan === s.data.name)
                              .length
                          }{" "}
                          alunos vinculados
                        </p>
                        <p>
                          <Badge>{s.data.status}</Badge>
                        </p>
                      </div>
                      <div className="card-actions">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => open("service", s)}
                        >
                          Editar plano
                          <ArrowUpRight size={14} />
                        </Button>
                      </div>
                    </Panel>
                  ))}
                  {!of("service").length && (
                    <Empty onAdd={() => open("service")} />
                  )}
                </div>
              )}
              {page === "comunicacao" && (
                <>
                  <div className="two-columns">
                    <Panel
                      title="Contato com intenção"
                      subtitle="Abra o WhatsApp e revise a mensagem antes de enviar"
                    >
                      <Communication
                        students={m.students}
                        onLog={(id, message) =>
                          void save("note", {
                            studentId: id,
                            message,
                            type: "Contato",
                            reminder: "",
                          })
                        }
                      />
                    </Panel>
                    <Panel
                      title="Lembretes de acompanhamento"
                      subtitle="Próximas ações do seu relacionamento"
                    >
                      {of("note")
                        .filter((n) => n.data.type === "Lembrete")
                        .map((n) => (
                          <div className="attention-row" key={n.id}>
                            <Clock3 size={17} className="orange" />
                            <div>
                              <b>{studentName(n.data.studentId)}</b>
                              <small>
                                {n.data.message} ·{" "}
                                {n.data.reminder && dateLabel(n.data.reminder)}
                              </small>
                            </div>
                            <button
                              className="icon-button"
                              onClick={() => open("note", n)}
                              aria-label="Editar lembrete"
                            >
                              <Settings2 size={15} />
                            </button>
                          </div>
                        ))}
                      {!of("note").some((n) => n.data.type === "Lembrete") && (
                        <Empty
                          text="Nenhum lembrete cadastrado."
                          onAdd={() => open("note")}
                        />
                      )}
                    </Panel>
                  </div>
                  {renderRecords(of("note"), "note")}
                </>
              )}
              {page === "relatorios" && (
                <>
                  <Panel
                    title="O período certo. A visão completa."
                    subtitle="Relatórios calculados a partir dos seus registros persistidos"
                  >
                    <div className="table-toolbar">
                      <label>
                        Data inicial
                        <input
                          type="date"
                          value={reportStart}
                          onChange={(e) => setReportStart(e.target.value)}
                        />
                      </label>
                      <label>
                        Data final
                        <input
                          type="date"
                          value={reportEnd}
                          onChange={(e) => setReportEnd(e.target.value)}
                        />
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                      >
                        <ArrowDownToLine size={14} />
                        Imprimir / PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => exportCSV(reportRecords(), "relatorio")}
                      >
                        <ArrowDownToLine size={14} />
                        Exportar período
                      </Button>
                    </div>
                    {reportStart > reportEnd ? (
                      <p className="error padded">
                        A data inicial deve ser anterior à data final.
                      </p>
                    ) : (
                      <div className="detail-metrics report-metrics">
                        {[
                          [
                            "Novos alunos",
                            reportRecords().filter((r) => r.kind === "student")
                              .length,
                          ],
                          [
                            "Sessões concluídas",
                            reportRecords().filter(
                              (r) =>
                                r.kind === "appointment" &&
                                r.data.status === "Concluído",
                            ).length,
                          ],
                          [
                            "Treinos registrados",
                            reportRecords().filter((r) => r.kind === "workout")
                              .length,
                          ],
                          [
                            "Receita recebida",
                            currency(
                              reportRecords()
                                .filter(
                                  (r) =>
                                    r.kind === "payment" &&
                                    r.data.status === "Recebido",
                                )
                                .reduce((s, r) => s + r.data.amount, 0),
                            ),
                          ],
                          [
                            "Avaliações",
                            reportRecords().filter(
                              (r) => r.kind === "assessment",
                            ).length,
                          ],
                          ["Base ativa atual", m.active.length],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <small>{label}</small>
                            <b>{value}</b>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                  <div className="two-columns">
                    <Panel
                      title="Crescimento de alunos"
                      subtitle="Base ativa acumulada · últimos 12 meses"
                    >
                      <GrowthChart data={m.growth} />
                    </Panel>
                    <Panel
                      title="Objetivos da base ativa"
                      subtitle="Distribuição atual dos alunos"
                    >
                      <Distribution data={distribution} />
                    </Panel>
                  </div>
                </>
              )}
              {page === "configuracoes" && (
                <div className="two-columns">
                  <Panel
                    title="Perfil profissional"
                    subtitle="Sua identidade no workspace"
                  >
                    <div className="settings-profile">
                      <Avatar
                        name={
                          of("profile")[0]?.data.name ||
                          user?.name ||
                          "Personal"
                        }
                        size="large"
                      />
                      <h2>{of("profile")[0]?.data.name || user?.name}</h2>
                      <p>{user?.email}</p>
                      <p>
                        {of("profile")[0]?.data.specialty || "Personal trainer"}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => open("profile", of("profile")[0])}
                      >
                        Editar perfil
                      </Button>
                    </div>
                  </Panel>
                  <Panel
                    title="Segurança e ambiente"
                    subtitle="Transparência sobre os seus dados"
                  >
                    <div className="settings-list">
                      <div>
                        <ShieldCheck size={20} />
                        <span>
                          <b>Acesso autenticado</b>
                          <small>
                            Sessão assinada, cookie HttpOnly e validação no
                            servidor.
                          </small>
                        </span>
                      </div>
                      <div>
                        <Users size={20} />
                        <span>
                          <b>Isolamento por profissional</b>
                          <small>
                            Todos os registros são vinculados ao usuário
                            autenticado.
                          </small>
                        </span>
                      </div>
                      <div>
                        <Activity size={20} />
                        <span>
                          <b>
                            {user?.demo
                              ? "Modo demonstrativo"
                              : "Workspace privado"}
                          </b>
                          <small>
                            {user?.demo
                              ? "Somente dados fictícios. Não cadastre informações reais nesta conta compartilhada."
                              : "Dados privados do seu espaço de trabalho."}
                          </small>
                        </span>
                      </div>
                      <div>
                        <Wallet size={20} />
                        <span>
                          <b>Financeiro manual</b>
                          <small>
                            Sem gateway bancário ou cobrança automática.
                          </small>
                        </span>
                      </div>
                    </div>
                  </Panel>
                </div>
              )}
            </motion.div>
          )}
          <footer className="app-footer">
            <span>
              <BrandMark className="footer-brand-artwork" />
              {brand.name} <i /> {brand.descriptor}
            </span>
            <span>
              Sua operação. Seus alunos. Sua evolução.
              <span className="footer-version">v0.1</span>
            </span>
          </footer>
        </main>
      </div>
      <Dialog
        open={!!historyEntry}
        onOpenChange={(v) => {
          if (!v) setHistoryEntry(null);
        }}
        title="Histórico de progressão"
        description="Versões anteriores e prescrição atual da ficha."
      >
        {historyEntry && (
          <div className="training-history">
            {[
              ...of("trainingHistory").filter(
                (r) => r.data.trainingId === historyEntry.id,
              ),
              historyEntry,
            ]
              .reverse()
              .map((r, i) => (
                <div key={r.id}>
                  <div className="history-date">
                    <Clock3 size={14} />
                    {new Date(r.updatedAt || r.createdAt).toLocaleString(
                      "pt-BR",
                    )}
                    {i === 0 && <Badge>Atual</Badge>}
                  </div>
                  <h3>{r.data.name}</h3>
                  {r.data.exercises?.map((e: any, n: number) => (
                    <p key={n}>
                      <b>{e.name}</b>
                      <span>
                        {e.sets} × {e.reps} · {e.load} kg
                      </span>
                    </p>
                  ))}
                </div>
              ))}
          </div>
        )}
      </Dialog>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v) setModal(null);
        }}
        title={
          modal
            ? `${modal.entry?.id ? "Editar" : "Novo"} ${titles[modal.kind]}`
            : ""
        }
      >
        {modal && (
          <RecordForm
            key={modal.kind + modal.entry?.id}
            kind={modal.kind}
            entry={modal.entry}
            records={records}
            studentId={modal.studentId}
            onCancel={() => setModal(null)}
            onSave={async (data) => {
              await save(modal.kind, data, modal.entry?.id || undefined);
              setModal(null);
            }}
          />
        )}
      </Dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
  function reportRecords() {
    return records.filter((r) => {
      const d = (
        r.data.date ||
        r.data.paidDate ||
        r.data.dueDate ||
        r.createdAt
      ).slice(0, 10);
      return d >= reportStart && d <= reportEnd;
    });
  }
  function moveCalendar(n: number) {
    const d = new Date(calendarDate + "T12:00:00");
    if (calendarView === "Mês") d.setMonth(d.getMonth() + n);
    else d.setDate(d.getDate() + n * (calendarView === "Semana" ? 7 : 1));
    setCalendarDate(d.toISOString().slice(0, 10));
  }
  function calendarDays() {
    const d = new Date(calendarDate + "T12:00:00");
    if (calendarView === "Semana")
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    if (calendarView === "Mês") d.setDate(1);
    const count =
      calendarView === "Dia"
        ? 1
        : calendarView === "Semana"
          ? 7
          : new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const a = new Date(d);
      a.setDate(a.getDate() + i);
      return a.toISOString().slice(0, 10);
    });
  }
  function renderRecords(list: Entry[], kind: Kind, id?: string) {
    const labels: Record<string, string[]> = {
      assessment: [
        "Aluno",
        "Data",
        "Peso",
        "Cintura",
        "Gordura",
        "Próxima avaliação",
      ],
      payment: [
        "Aluno",
        "Serviço",
        "Valor",
        "Vencimento",
        "Recebimento",
        "Status",
        "Método",
      ],
      workout: ["Aluno", "Data", "Observações"],
      note: ["Aluno", "Tipo", "Mensagem", "Lembrete"],
      training: ["Ficha", "Aluno", "Divisão", "Exercícios"],
      appointment: ["Aluno", "Data", "Horário", "Tipo", "Status"],
    };
    return (
      <Panel
        title={`${titles[kind][0].toUpperCase() + titles[kind].slice(1)}s`}
        subtitle={`${list.length} registros`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => open(kind, undefined, id)}
          >
            <Plus size={13} />
            Adicionar
          </Button>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {(labels[kind] || ["Registro"]).map((h) => (
                  <th key={h}>{h}</th>
                ))}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const d = r.data;
                const values: Record<string, any[]> = {
                  assessment: [
                    studentName(d.studentId),
                    d.date && dateLabel(d.date),
                    `${d.weight} kg`,
                    `${d.waist} cm`,
                    `${d.fat}%`,
                    d.nextDate && dateLabel(d.nextDate),
                  ],
                  payment: [
                    studentName(d.studentId),
                    d.service,
                    currency(d.amount || 0),
                    d.dueDate && dateLabel(d.dueDate),
                    d.paidDate ? dateLabel(d.paidDate) : "—",
                    <Badge key="status">{d.status}</Badge>,
                    d.method,
                  ],
                  workout: [
                    studentName(d.studentId),
                    d.date && dateLabel(d.date),
                    d.notes || "—",
                  ],
                  note: [
                    studentName(d.studentId),
                    d.type,
                    d.message,
                    d.reminder ? dateLabel(d.reminder) : "—",
                  ],
                  training: [
                    d.name,
                    studentName(d.studentId),
                    d.division,
                    d.exercises?.length,
                  ],
                  appointment: [
                    studentName(d.studentId),
                    d.date && dateLabel(d.date),
                    d.time,
                    d.type,
                    <Badge key="status">{d.status}</Badge>,
                  ],
                };
                return (
                  <tr key={r.id}>
                    {(values[kind] || []).map((v, i) => (
                      <td key={i}>{v}</td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => open(kind, r)}
                        >
                          Editar
                        </Button>
                        {kind === "payment" && d.status === "Pendente" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void update(r, {
                                status: "Recebido",
                                paidDate: today(),
                              })
                            }
                          >
                            <Check size={13} />
                            Receber
                          </Button>
                        )}
                        {kind === "appointment" &&
                          !["Concluído", "Cancelado"].includes(d.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void update(r, { status: "Concluído" })
                              }
                            >
                              <Check size={13} />
                              Concluir
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!list.length && <Empty onAdd={() => open(kind, undefined, id)} />}
        </div>
      </Panel>
    );
  }
}
function Login({
  demoEnabled,
  onSuccess,
}: {
  demoEnabled: boolean;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const login = async (demo = false) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demo ? { demo: true } : { email, password }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao entrar");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-story">
        <Logo />
        <div>
          <span className="eyebrow">PERSONAL PERFORMANCE OS</span>
          <h1>
            O próximo nível
            <br />
            da sua operação<span>.</span>
          </h1>
          <p>Sua operação. Seus alunos. Sua evolução.</p>
        </div>
        <small>FEITO PARA QUEM TRANSFORMA VIDAS.</small>
      </div>
      <div className="login-form">
        <BrandMark className="login-brand-artwork" />
        <span className="eyebrow">BEM-VINDO À {brand.wordmark}</span>
        <h2>Seu centro de performance.</h2>
        <p>Entre para continuar de onde parou.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void login();
          }}
        >
          <label>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="voce@exemplo.com"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Sua senha"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy} type="submit">
            {busy ? (
              <Loader2 size={17} className="spin" />
            ) : (
              "Entrar no workspace"
            )}
            <ArrowRight size={16} />
          </Button>
        </form>
        {demoEnabled && (
          <>
            <div className="login-divider">OU EXPLORE O PRODUTO</div>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void login(true)}
            >
              <Sparkles size={16} />
              Acessar demonstração
            </Button>
            <small className="demo-disclaimer">
              Demonstração compartilhada com dados fictícios.
              <br />
              Não utilize informações pessoais reais.
            </small>
          </>
        )}
        <small className="login-security">
          <ShieldCheck size={13} />
          Seu espaço. Seus dados. Acesso protegido.
        </small>
      </div>
    </div>
  );
}
function Communication({
  students,
  onLog,
}: {
  students: Entry[];
  onLog: (id: string, message: string) => void;
}) {
  const [id, setId] = useState(students[0]?.id || "");
  const [message, setMessage] = useState(
    "Olá! Como está sua semana de treinos? Vamos manter o foco no seu objetivo.",
  );
  const student = students.find((s) => s.id === id);
  const phone = String(student?.data.phone || "").replace(/\D/g, "");
  return (
    <div className="communication-form">
      <label>
        Aluno
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.data.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Modelo
        <select onChange={(e) => setMessage(e.target.value)}>
          <option>
            Olá! Como está sua semana de treinos? Vamos manter o foco no seu
            objetivo.
          </option>
          <option>
            Olá! Sua próxima avaliação está chegando. Vamos agendar?
          </option>
          <option>
            Parabéns pela consistência nos treinos! Continue assim.
          </option>
        </select>
      </label>
      <label>
        Mensagem
        <textarea
          value={message}
          rows={4}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {phone.length < 10 ? (
        <p className="muted">
          Cadastre um telefone válido no perfil do aluno para abrir o WhatsApp.
        </p>
      ) : (
        <a
          className="button primary"
          href={`https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir no WhatsApp
          <ArrowUpRight size={16} />
        </a>
      )}
      <Button
        variant="outline"
        onClick={() => onLog(id, message)}
        disabled={!id || !message.trim()}
      >
        Registrar anotação de contato
      </Button>
      <small className="muted">
        Abrir o WhatsApp não confirma o envio. O envio é realizado por você.
      </small>
    </div>
  );
}
function ExerciseLibrary({ query }: { query: string }) {
  const [group, setGroup] = useState("Todos");
  const items = [
    [
      "Agachamento livre",
      "Pernas",
      "Barra",
      "Pés estáveis, coluna neutra e amplitude controlada.",
    ],
    [
      "Leg press 45°",
      "Pernas",
      "Máquina",
      "Mantenha quadril apoiado e controle a descida.",
    ],
    [
      "Supino reto",
      "Peitoral",
      "Barra",
      "Escápulas estáveis e movimento controlado.",
    ],
    [
      "Puxada frontal",
      "Costas",
      "Polia",
      "Evite balanço e conduza os cotovelos para baixo.",
    ],
    [
      "Remada curvada",
      "Costas",
      "Barra",
      "Mantenha coluna neutra durante a execução.",
    ],
    [
      "Desenvolvimento",
      "Ombros",
      "Halteres",
      "Evite compensação na região lombar.",
    ],
    [
      "Elevação lateral",
      "Ombros",
      "Halteres",
      "Eleve com controle e carga adequada.",
    ],
    ["Rosca direta", "Braços", "Barra", "Mantenha cotovelos estáveis."],
    [
      "Tríceps na polia",
      "Braços",
      "Polia",
      "Estenda cotovelos sem movimentar os ombros.",
    ],
    [
      "Prancha abdominal",
      "Core",
      "Peso corporal",
      "Mantenha alinhamento e respiração contínua.",
    ],
  ];
  return (
    <>
      <div className="tabs">
        {[
          "Todos",
          "Pernas",
          "Peitoral",
          "Costas",
          "Ombros",
          "Braços",
          "Core",
        ].map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={group === g ? "active" : ""}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="record-grid">
        {items
          .filter(
            (i) =>
              (group === "Todos" || i[1] === group) &&
              i.join(" ").toLowerCase().includes(query.toLowerCase()),
          )
          .map(([name, g, equipment, instruction]) => (
            <Panel
              key={name}
              title={name}
              subtitle={`${g} · ${equipment}`}
              action={<Dumbbell size={19} className="orange" />}
            >
              <p className="padded muted">{instruction}</p>
            </Panel>
          ))}
      </div>
    </>
  );
}
