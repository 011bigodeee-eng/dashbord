"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ImagePlus,
  ShieldCheck,
  Trash2,
  Paperclip,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { dateLabel } from "@/lib/schemas";
type FileEntry = { id: string; type: string; date: string; name: string };
export function PrivateFiles({
  studentId,
  type = "photo",
}: {
  studentId: string;
  type?: "photo" | "document";
}) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [slider, setSlider] = useState(50);
  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/files?studentId=${encodeURIComponent(studentId)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const items = data.files.filter((f: FileEntry) => f.type === type);
      setFiles(items);
      setLeft(items[0]?.id || "");
      setRight(items.at(-1)?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar anexos");
    }
  }, [studentId, type]);
  useEffect(() => {
    if (studentId) void load();
  }, [load, studentId]);
  return (
    <div className="private-files">
      <div className="privacy-caption">
        <ShieldCheck size={16} />
        {type === "photo"
          ? "Fotos privadas · somente com autorização do aluno"
          : "Anexos privados da avaliação"}{" "}
        · até 5 MB
      </div>
      {type === "photo" && files.length > 0 && (
        <>
          <div className="photo-selectors">
            <label>
              Registro inicial
              <select value={left} onChange={(e) => setLeft(e.target.value)}>
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {dateLabel(f.date)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Registro de comparação
              <select value={right} onChange={(e) => setRight(e.target.value)}>
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {dateLabel(f.date)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="photo-comparison">
            <img
              src={`/api/files/${right}`}
              alt="Registro físico de comparação autorizado"
            />
            <div
              className="photo-before"
              style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
            >
              <img
                src={`/api/files/${left}`}
                alt="Registro físico inicial autorizado"
              />
            </div>
            <div className="photo-divider" style={{ left: `${slider}%` }} />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
            aria-label="Comparar registros fotográficos"
            className="photo-slider"
          />
        </>
      )}
      {!files.length && (
        <div className="photo-empty">
          <ImagePlus size={27} />
          <p>
            {type === "photo"
              ? "Uma evolução real merece um registro autorizado."
              : "Adicione os documentos desta avaliação."}
          </p>
        </div>
      )}
      <div className="file-list">
        {files.map((f) => (
          <div key={f.id}>
            <Paperclip size={14} />
            <a
              href={`/api/files/${f.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {f.name}
            </a>
            <small>{dateLabel(f.date)}</small>
            <button
              aria-label={`Excluir ${f.name}`}
              className="icon-button"
              onClick={async () => {
                if (!window.confirm("Excluir permanentemente este arquivo?"))
                  return;
                const res = await fetch(`/api/files/${f.id}`, {
                  method: "DELETE",
                });
                if (res.ok) await load();
                else setError("Não foi possível excluir o arquivo.");
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          const form = e.currentTarget;
          const data = new FormData(form);
          data.set("studentId", studentId);
          data.set("type", type);
          try {
            const res = await fetch("/api/files", {
              method: "POST",
              body: data,
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            form.reset();
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Falha no upload");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="file-upload-row">
          <label>
            Arquivo
            <input
              type="file"
              name="file"
              accept={
                type === "photo"
                  ? "image/jpeg,image/png,image/webp"
                  : "application/pdf,image/jpeg,image/png,image/webp"
              }
              required
            />
          </label>
          <label>
            Data do registro
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
        </div>
        {type === "photo" && (
          <label className="consent-check">
            <input type="checkbox" name="consent" value="true" required />
            Confirmo que o aluno autorizou o armazenamento privado desta foto.
          </label>
        )}
        <Button disabled={busy || !studentId} type="submit" size="sm">
          {busy ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
          Salvar arquivo privado
        </Button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
