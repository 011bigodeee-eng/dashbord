import { Entry } from "./schemas";
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
export function metrics(records: Entry[], now = new Date()) {
  const select = (kind: string) => records.filter((r) => r.kind === kind);
  const students = select("student"),
    active = students.filter((r) => r.data.status === "Ativo");
  const month = now.toISOString().slice(0, 7);
  const payments = select("payment");
  const monthly = payments.filter((r) =>
    (r.data.status === "Recebido"
      ? r.data.paidDate
      : r.data.dueDate
    ).startsWith(month),
  );
  const received = monthly
    .filter((r) => r.data.status === "Recebido")
    .reduce((s, r) => s + r.data.amount, 0);
  const pending = payments.filter((r) => r.data.status === "Pendente");
  const start = new Date(now);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const appointments = select("appointment").filter(
    (r) =>
      new Date(r.data.date + "T12:00:00") >= start &&
      new Date(r.data.date + "T12:00:00") < end &&
      r.data.status !== "Cancelado",
  );
  const completed = appointments.filter(
    (r) => r.data.status === "Concluído",
  ).length;
  const judged = appointments.filter((r) =>
    ["Concluído", "Ausente"].includes(r.data.status),
  ).length;
  const progress = new Set(
    select("assessment")
      .filter((r) => r.data.date.startsWith(month))
      .map((r) => r.data.studentId),
  ).size;
  const growth = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(
      now.getFullYear(),
      now.getMonth() - 11 + i + 1,
      0,
      23,
      59,
      59,
    );
    const prev = new Date(d);
    prev.setMonth(prev.getMonth() - 12);
    return {
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      value: active.filter((r) => new Date(r.createdAt) <= d).length,
      previous: students.filter((r) => new Date(r.createdAt) <= prev).length,
    };
  });
  const revenue = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const p = payments.filter((r) => r.data.dueDate.startsWith(m));
    return {
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      received: p
        .filter((r) => r.data.status === "Recebido")
        .reduce((s, r) => s + r.data.amount, 0),
      pending: p
        .filter((r) => r.data.status === "Pendente")
        .reduce((s, r) => s + r.data.amount, 0),
      expected: p.reduce((s, r) => s + r.data.amount, 0),
    };
  });
  return {
    students,
    active,
    received,
    pending,
    pendingTotal: pending.reduce((s, r) => s + r.data.amount, 0),
    appointments,
    completed,
    presence: judged ? Math.round((completed / judged) * 100) : 0,
    progress,
    growth,
    revenue,
  };
}
