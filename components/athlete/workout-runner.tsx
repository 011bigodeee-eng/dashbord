"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Save,
  Timer,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkoutState } from "@/lib/portal-validation";
import type { Run } from "./types";
const clock = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
export default function WorkoutRunner({
  run,
  onUpdate,
}: {
  run: Run;
  onUpdate: () => Promise<void>;
}) {
  const [state, setState] = useState<WorkoutState>(run.state);
  const [status, setStatus] = useState(run.status);
  const [updated, setUpdated] = useState(run.updatedAt);
  const [seconds, setSeconds] = useState(run.activeSeconds);
  const [tick, setTick] = useState(Date.now());
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restPaused, setRestPaused] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(run.feedback);
  const [difficulty, setDifficulty] = useState(run.difficulty || 5);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);
  const latestState = useRef(state);
  latestState.current = state;
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const duration =
    seconds +
    (status === "IN_PROGRESS"
      ? Math.max(0, Math.floor((tick - new Date(updated).getTime()) / 1000))
      : 0);
  const rest = restUntil
    ? Math.max(0, Math.ceil((restUntil - tick) / 1000))
    : restPaused || 0;
  const completed = state.sets.filter((s) => s.done);
  const progress = Math.round(
    (completed.length / (state.sets.length || 1)) * 100,
  );
  const exercise = run.snapshot.exercises[state.exerciseIndex];
  const persist = (action: string, next = state) => {
    setSaving(true);
    pending.current++;
    setError("");
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            sessionId: run.id,
            state: next,
            feedback,
            difficulty,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const saved = data.session as Run;
        setSeconds(saved.activeSeconds);
        setUpdated(saved.updatedAt);
        setStatus(saved.status);
        setUnsaved(
          JSON.stringify(latestState.current) !== JSON.stringify(next),
        );
        if (action === "finish") await onUpdate();
      });
    queue.current = task;
    void task
      .catch((e) => {
        setError(e.message);
        setUnsaved(true);
      })
      .finally(() => {
        pending.current--;
        if (!pending.current) setSaving(false);
      });
    return task;
  };
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (unsaved || pending.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [unsaved]);
  function editSet(index: number, key: "load" | "reps", value: number) {
    setUnsaved(true);
    setState((old) => ({
      ...old,
      sets: old.sets.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    }));
  }
  if (status === "COMPLETED")
    return (
      <div className="workout-complete">
        <div className="complete-medal">
          <Trophy size={45} />
        </div>
        <span className="eyebrow">COMPROMISSO CUMPRIDO</span>
        <h1>
          Mais um passo.
          <br />
          <em>Mais forte.</em>
        </h1>
        <p>{run.snapshot.name}</p>
        <div className="athlete-summary-grid">
          <div>
            <Clock3 size={18} />
            <b>{clock(seconds)}</b>
            <small>Tempo ativo</small>
          </div>
          <div>
            <Dumbbell size={18} />
            <b>{new Set(completed.map((s) => s.exerciseIndex)).size}</b>
            <small>Exercícios realizados</small>
          </div>
          <div>
            <Check size={18} />
            <b>{completed.length}</b>
            <small>Séries concluídas</small>
          </div>
        </div>
        <div className="athlete-panel">
          <h3>Como foi esse treino?</h3>
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
            Conte para o seu personal
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={2000}
              placeholder="Como você se sentiu? Alguma observação?"
            />
          </label>
          <Button
            disabled={saving || !feedback.trim()}
            onClick={() => void persist("feedback").catch(() => {})}
          >
            <Save size={16} />
            Enviar feedback
          </Button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Link className="button primary" href="/athlete">
          Voltar ao início
          <ChevronRight size={17} />
        </Link>
      </div>
    );
  return (
    <div className="workout-runner">
      <div className="runner-top">
        <Link
          href="/athlete/treinos"
          className="icon-button"
          aria-label="Voltar aos treinos"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <small>TREINO EM ANDAMENTO</small>
          <h2>{run.snapshot.name}</h2>
        </div>
        <span className="runner-clock">
          <Clock3 size={15} />
          {clock(duration)}
        </span>
      </div>
      <div className="runner-progress">
        <div>
          <span>
            {completed.length} de {state.sets.length} séries
          </span>
          <b>{progress}%</b>
        </div>
        <div className="athlete-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="runner-prescription">
        <span className="exercise-counter">
          EXERCÍCIO {state.exerciseIndex + 1} / {run.snapshot.exercises.length}
        </span>
        <div className="exercise-glyph">
          <Dumbbell size={50} />
          <span>PRESCRIÇÃO DO SEU PERSONAL</span>
        </div>
        <h1>{exercise.name}</h1>
        <div className="exercise-prescription">
          <span>
            <b>{exercise.sets}</b>séries
          </span>
          <span>
            <b>{exercise.reps}</b>repetições
          </span>
          <span>
            <b>{exercise.load} kg</b>carga planejada
          </span>
          <span>
            <b>{exercise.rest}s</b>descanso
          </span>
        </div>
        {(exercise.notes || exercise.tempo) && (
          <div className="coach-tip">
            <Flame size={16} />
            <p>
              {exercise.notes}
              {exercise.tempo && ` · Tempo: ${exercise.tempo}`}
            </p>
          </div>
        )}
      </div>
      <div className="runner-set-table">
        <div className="set-table-header">
          <span>SÉRIE</span>
          <span>CARGA / KG</span>
          <span>REPETIÇÕES</span>
          <span>FEITO</span>
        </div>
        {state.sets.map(
          (set, index) =>
            set.exerciseIndex === state.exerciseIndex && (
              <div key={index} className={set.done ? "set-done" : ""}>
                <b>{String(set.setIndex + 1).padStart(2, "0")}</b>
                <input
                  aria-label={`Carga série ${set.setIndex + 1}`}
                  type="number"
                  min="0"
                  max="2000"
                  value={set.load}
                  disabled={status === "PAUSED"}
                  onChange={(e) =>
                    editSet(index, "load", Number(e.target.value))
                  }
                  onBlur={() => {
                    if (unsaved) void persist("save").catch(() => {});
                  }}
                />
                <input
                  aria-label={`Repetições série ${set.setIndex + 1}`}
                  type="number"
                  min="0"
                  max="1000"
                  value={set.reps}
                  disabled={status === "PAUSED"}
                  onChange={(e) =>
                    editSet(index, "reps", Number(e.target.value))
                  }
                  onBlur={() => {
                    if (unsaved) void persist("save").catch(() => {});
                  }}
                />
                <button
                  aria-label={`${set.done ? "Desmarcar" : "Concluir"} série ${set.setIndex + 1}`}
                  className="set-check"
                  disabled={status === "PAUSED"}
                  onClick={() => {
                    const next = {
                      ...state,
                      sets: state.sets.map((s, i) =>
                        i === index ? { ...s, done: !s.done } : s,
                      ),
                    };
                    setState(next);
                    setUnsaved(true);
                    void persist("save", next)
                      .then(() => {
                        if (!set.done) {
                          setRestUntil(Date.now() + exercise.rest * 1000);
                          setRestPaused(null);
                          navigator.vibrate?.(30);
                        }
                      })
                      .catch(() => {});
                  }}
                >
                  <Check size={22} />
                </button>
              </div>
            ),
        )}
      </div>
      <div className="rest-timer">
        <div>
          <Timer size={20} />
          <span>
            RECUPERE O FÔLEGO
            <small>
              {rest > 0
                ? "Seu próximo esforço começa em"
                : "Descanso entre séries"}
            </small>
          </span>
        </div>
        <b aria-live="off">{clock(rest)}</b>
        <button
          className="icon-button"
          aria-label={restUntil ? "Pausar descanso" : "Iniciar descanso"}
          onClick={() => {
            if (restUntil) {
              setRestPaused(rest);
              setRestUntil(null);
            } else {
              setRestUntil(Date.now() + (restPaused ?? exercise.rest) * 1000);
              setRestPaused(null);
            }
          }}
        >
          {restUntil ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          className="icon-button"
          aria-label="Reiniciar descanso"
          onClick={() => {
            setRestUntil(Date.now() + exercise.rest * 1000);
            setRestPaused(null);
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="runner-exercise-nav">
        <Button
          variant="outline"
          disabled={state.exerciseIndex === 0}
          onClick={() => {
            const next = { ...state, exerciseIndex: state.exerciseIndex - 1 };
            setState(next);
            void persist("save", next).catch(() => {});
          }}
        >
          <ChevronLeft size={17} />
          Anterior
        </Button>
        <span>
          {state.exerciseIndex + 1} de {run.snapshot.exercises.length}
        </span>
        <Button
          variant="outline"
          disabled={state.exerciseIndex === run.snapshot.exercises.length - 1}
          onClick={() => {
            const next = { ...state, exerciseIndex: state.exerciseIndex + 1 };
            setState(next);
            void persist("save", next).catch(() => {});
          }}
        >
          Próximo
          <ChevronRight size={17} />
        </Button>
      </div>
      {error && (
        <p role="alert" className="error athlete-error">
          {error} Seu último progresso confirmado continua salvo no servidor.
        </p>
      )}
      <div className="runner-save-status" role="status">
        {saving
          ? "Salvando no seu histórico…"
          : unsaved
            ? "Existem alterações não salvas."
            : "Progresso salvo no seu histórico."}
        {unsaved && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void persist("save").catch(() => {})}
          >
            Tentar salvar
          </Button>
        )}
      </div>
      <div className="runner-actions">
        <Button
          variant="outline"
          disabled={saving}
          onClick={() =>
            void persist(status === "PAUSED" ? "resume" : "pause").catch(
              () => {},
            )
          }
        >
          {status === "PAUSED" ? <Play size={17} /> : <Pause size={17} />}{" "}
          {status === "PAUSED" ? "Retomar" : "Pausar"} treino
        </Button>
        <Button
          disabled={!completed.length || status === "PAUSED"}
          onClick={() => setFinishOpen(true)}
        >
          <Check size={17} />
          Finalizar treino
        </Button>
      </div>
      {finishOpen && (
        <div className="finish-confirm athlete-panel">
          <h3>Pronto para concluir?</h3>
          <p>
            {completed.length} séries serão registradas.{" "}
            {completed.length < state.sets.length
              ? "As séries não concluídas ficarão identificadas no histórico."
              : ""}
          </p>
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
            Feedback para o personal
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={2000}
            />
          </label>
          <div className="runner-actions">
            <Button variant="outline" onClick={() => setFinishOpen(false)}>
              Continuar treinando
            </Button>
            <Button
              disabled={saving}
              onClick={() => void persist("finish").catch(() => {})}
            >
              Confirmar conclusão
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
