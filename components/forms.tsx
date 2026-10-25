"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { schemas, Kind, Entry } from "@/lib/schemas";
import { Button } from "./ui/button";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
export const titles: Record<Kind, string> = {
  student: "aluno",
  training: "treino",
  assessment: "avaliação",
  appointment: "sessão",
  payment: "pagamento",
  service: "plano",
  note: "contato",
  workout: "check-in",
  profile: "perfil",
};
const goals = [
  "Hipertrofia",
  "Emagrecimento",
  "Condicionamento",
  "Saúde e qualidade de vida",
  "Performance esportiva",
];
const exercises = [
  "Agachamento livre",
  "Leg press 45°",
  "Cadeira extensora",
  "Supino reto",
  "Supino inclinado",
  "Remada curvada",
  "Puxada frontal",
  "Desenvolvimento",
  "Elevação lateral",
  "Rosca direta",
  "Tríceps na polia",
  "Prancha abdominal",
  "Levantamento terra",
  "Esteira",
];
export function RecordForm({
  kind,
  entry,
  records,
  studentId,
  onSave,
  onCancel,
}: {
  kind: Kind;
  entry?: Entry;
  records: Entry[];
  studentId?: string;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const next = new Date();
  next.setDate(next.getDate() + 30);
  const defaults: Record<string, any> = {
    student: {
      name: "",
      email: "",
      phone: "",
      goal: goals[0],
      plan: "",
      status: "Ativo",
      notes: "",
    },
    training: {
      name: "",
      studentId: studentId || "",
      division: "A",
      exercises: [
        {
          name: exercises[0],
          sets: 3,
          reps: "10–12",
          load: 0,
          rest: 60,
          tempo: "2–0–2",
          notes: "",
        },
      ],
      notes: "",
    },
    assessment: {
      studentId: studentId || "",
      date: today,
      weight: 70,
      height: 170,
      waist: 0,
      chest: 0,
      hip: 0,
      fat: 0,
      nextDate: next.toISOString().slice(0, 10),
      notes: "",
    },
    appointment: {
      studentId: studentId || "",
      date: today,
      time: "09:00",
      duration: 60,
      type: "Musculação",
      status: "Confirmado",
      notes: "",
    },
    payment: {
      studentId: studentId || "",
      service: "Personal presencial",
      amount: 450,
      dueDate: today,
      paidDate: today,
      status: "Recebido",
      method: "Pix",
    },
    service: {
      name: "",
      description: "",
      price: 0,
      frequency: "3x por semana",
      duration: "Mensal",
      status: "Ativo",
    },
    note: {
      studentId: studentId || "",
      message: "",
      reminder: "",
      type: "Anotação",
    },
    workout: {
      studentId: studentId || "",
      date: today,
      trainingId: "",
      notes: "",
    },
    profile: { name: "", specialty: "", phone: "" },
  };
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(schemas[kind]) as any,
    defaultValues: entry?.data || defaults[kind],
  });
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<number | null>(null);
  const input = (name: string, label: string, type = "text") => (
    <label className={type === "textarea" ? "full" : ""}>
      {label}
      {type === "textarea" ? (
        <textarea aria-label={label} {...register(name)} rows={3} />
      ) : (
        <input
          aria-label={label}
          {...register(name)}
          type={type}
          step={type === "number" ? "any" : undefined}
        />
      )}{" "}
      {errors[name] && (
        <small className="error">{String(errors[name]?.message)}</small>
      )}
    </label>
  );
  const select = (
    name: string,
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <label>
      {label}
      <select aria-label={label} {...register(name)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {errors[name] && (
        <small className="error">{String(errors[name]?.message)}</small>
      )}
    </label>
  );
  const opts = (v: string[]) => v.map((s) => ({ value: s, label: s }));
  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        setError("");
        try {
          await onSave(data);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Falha ao salvar");
        }
      })}
      className="record-form"
    >
      <div className="form-grid">
        {kind !== "student" &&
          kind !== "service" &&
          kind !== "profile" &&
          select("studentId", "Aluno", [
            { value: "", label: "Selecione um aluno" },
            ...records
              .filter((r) => r.kind === "student" && r.data.status === "Ativo")
              .map((r) => ({ value: r.id, label: r.data.name })),
          ])}
        {kind === "student" && (
          <>
            {input("name", "Nome completo")}
            {input("email", "E-mail", "email")}
            {input("phone", "Telefone / WhatsApp", "tel")}
            {select("goal", "Objetivo", opts(goals))}
            {select("plan", "Plano", [
              { value: "", label: "Sem plano" },
              ...records
                .filter((r) => r.kind === "service")
                .map((r) => ({ value: r.data.name, label: r.data.name })),
            ])}
            {select("status", "Status", opts(["Ativo", "Inativo"]))}
            {input("notes", "Observações privadas", "textarea")}
          </>
        )}
        {kind === "training" && (
          <>
            {input("name", "Nome da ficha")}
            {input("division", "Divisão (A / B / C)")}
            <div className="full">
              <Controller
                name="exercises"
                control={control}
                render={({ field }) => (
                  <div className="exercise-editor">
                    {field.value.map((ex: any, i: number) => (
                      <details
                        key={i}
                        open
                        draggable
                        onDragStart={() => setDrag(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (drag === null) return;
                          const a = [...field.value];
                          const [item] = a.splice(drag, 1);
                          a.splice(i, 0, item);
                          field.onChange(a);
                          setDrag(null);
                        }}
                      >
                        <summary>
                          <GripVertical size={15} />
                          <span>
                            {String(i + 1).padStart(2, "0")} · {ex.name}
                          </span>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Remover exercício"
                            onClick={() =>
                              field.onChange(
                                field.value.filter(
                                  (_: any, n: number) => n !== i,
                                ),
                              )
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </summary>
                        <div className="exercise-fields">
                          {[
                            ["name", "Exercício"],
                            ["sets", "Séries"],
                            ["reps", "Repetições"],
                            ["load", "Carga (kg)"],
                            ["rest", "Descanso (s)"],
                            ["tempo", "Tempo"],
                            ["notes", "Observação"],
                          ].map(([key, label]) => (
                            <label key={key}>
                              {label}
                              <input
                                list={key === "name" ? "exercises" : undefined}
                                type={
                                  ["sets", "load", "rest"].includes(key)
                                    ? "number"
                                    : "text"
                                }
                                value={ex[key]}
                                onChange={(e) =>
                                  field.onChange(
                                    field.value.map((v: any, n: number) =>
                                      n === i
                                        ? {
                                            ...v,
                                            [key]: [
                                              "sets",
                                              "load",
                                              "rest",
                                            ].includes(key)
                                              ? Number(e.target.value)
                                              : e.target.value,
                                          }
                                        : v,
                                    ),
                                  )
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </details>
                    ))}
                    <datalist id="exercises">
                      {exercises.map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        field.onChange([
                          ...field.value,
                          {
                            name: exercises[0],
                            sets: 3,
                            reps: "12",
                            load: 0,
                            rest: 60,
                            tempo: "",
                            notes: "",
                          },
                        ])
                      }
                    >
                      <Plus size={15} />
                      Adicionar exercício
                    </Button>
                  </div>
                )}
              />
              {errors.exercises && (
                <small className="error">
                  Adicione ao menos um exercício e confira seus valores.
                </small>
              )}
            </div>
            {input("notes", "Orientações", "textarea")}
          </>
        )}
        {kind === "assessment" && (
          <>
            {input("date", "Data", "date")}
            {input("weight", "Peso (kg)", "number")}
            {input("height", "Altura (cm)", "number")}
            {input("waist", "Cintura (cm)", "number")}
            {input("chest", "Tórax (cm)", "number")}
            {input("hip", "Quadril (cm)", "number")}
            {input("fat", "Gordura informada (%)", "number")}
            {input("nextDate", "Próxima avaliação", "date")}
            {input("notes", "Objetivos, metodologia e observações", "textarea")}
            <p className="muted full">
              Medidas informadas pelo profissional. Nenhum diagnóstico ou
              percentual de gordura é estimado automaticamente.
            </p>
          </>
        )}
        {kind === "appointment" && (
          <>
            {input("date", "Data", "date")}
            {input("time", "Horário", "time")}
            {input("duration", "Duração (min)", "number")}
            {select(
              "type",
              "Atendimento",
              opts([
                "Musculação",
                "Funcional",
                "Avaliação física",
                "Consultoria online",
              ]),
            )}
            {select(
              "status",
              "Status",
              opts([
                "Confirmado",
                "Pendente",
                "Concluído",
                "Ausente",
                "Cancelado",
              ]),
            )}
            {input("notes", "Observações", "textarea")}
          </>
        )}
        {kind === "payment" && (
          <>
            {select(
              "service",
              "Serviço",
              opts([
                ...new Set([
                  "Personal presencial",
                  ...records
                    .filter((r) => r.kind === "service")
                    .map((r) => String(r.data.name)),
                ]),
              ]),
            )}
            {input("amount", "Valor (R$)", "number")}
            {input("dueDate", "Vencimento", "date")}
            {select("status", "Status", opts(["Recebido", "Pendente"]))}
            {input("paidDate", "Data de recebimento", "date")}
            {select(
              "method",
              "Método",
              opts(["Pix", "Dinheiro", "Cartão", "Transferência"]),
            )}
            <p className="muted full">
              Registro manual. Nenhuma transação bancária será realizada.
            </p>
          </>
        )}
        {kind === "service" && (
          <>
            {input("name", "Nome do plano")}
            {input("price", "Preço (R$)", "number")}
            {input("frequency", "Frequência")}
            {input("duration", "Duração")}
            {select("status", "Status", opts(["Ativo", "Inativo"]))}
            {input("description", "Descrição", "textarea")}
          </>
        )}
        {kind === "note" && (
          <>
            {select("type", "Tipo", opts(["Anotação", "Contato", "Lembrete"]))}
            {input("reminder", "Lembrete", "date")}
            {input("message", "Mensagem / anotação", "textarea")}
          </>
        )}
        {kind === "workout" && (
          <>
            {input("date", "Data", "date")}
            {select("trainingId", "Treino", [
              { value: "", label: "Treino livre" },
              ...records
                .filter((r) => r.kind === "training")
                .map((r) => ({ value: r.id, label: r.data.name })),
            ])}
            {input("notes", "Observações", "textarea")}
          </>
        )}
        {kind === "profile" && (
          <>
            {input("name", "Nome do profissional")}
            {input("specialty", "Especialidade")}
            {input("phone", "Telefone", "tel")}
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="error form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Plus size={16} />
          )}{" "}
          {isSubmitting
            ? "Salvando…"
            : entry
              ? "Salvar alterações"
              : `Salvar ${titles[kind]}`}
        </Button>
      </div>
    </form>
  );
}
