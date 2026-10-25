"use client";
import { brand } from "@/lib/brand";
import { RotateCcw } from "lucide-react";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="fatal-error">
      <span className="eyebrow">{brand.wordmark} · RECUPERAR WORKSPACE</span>
      <h1>Não foi possível carregar este espaço.</h1>
      <p>
        Confira a conexão com o banco e tente novamente. Seus registros
        permanecem salvos.
      </p>
      <button className="button primary" onClick={reset}>
        <RotateCcw size={16} />
        Tentar novamente
      </button>
    </div>
  );
}
