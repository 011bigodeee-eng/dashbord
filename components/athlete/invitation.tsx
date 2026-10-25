"use client";
import { appFetch } from "@/lib/app-fetch";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { brand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
export default function Invitation({ token }: { token: string }) {
  const [invite, setInvite] = useState<{ name: string; email: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    appFetch(`/api/invitations/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setInvite(d);
      })
      .catch((e) => setError(e.message));
  }, [token]);
  return (
    <div className="invite-page">
      <div className="invite-card">
        <Link className="athlete-wordmark" href="/login">
          {brand.wordmark}
          <span>ATHLETE</span>
        </Link>
        <div className="invite-symbol">
          <ShieldCheck size={29} />
        </div>
        <span className="eyebrow">SEU PRÓXIMO CAPÍTULO</span>
        <h1>
          {invite
            ? `Vamos começar, ${invite.name.split(" ")[0]}?`
            : "Seu acesso ao Athlete."}
        </h1>
        <p>
          Um espaço só seu para treinar, acompanhar sua evolução e manter
          contato com seu personal.
        </p>
        {invite && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              if (password !== confirm) {
                setError("As senhas não coincidem.");
                return;
              }
              setBusy(true);
              try {
                const r = await appFetch(`/api/invitations/${token}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ password }),
                });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                window.location.assign("/athlete");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              E-mail do convite
              <input value={invite.email} readOnly autoComplete="username" />
            </label>
            <label>
              Crie sua senha
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <small>Mínimo de 12 caracteres.</small>
            </label>
            <label>
              Confirme a senha
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <p className="muted">
              Seus registros serão acessíveis a você e ao profissional
              responsável pelo seu acompanhamento.
            </p>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <>
                  Ativar meu acesso
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Link href="/login" className="text-link">
          Já tenho uma conta
        </Link>
      </div>
    </div>
  );
}
