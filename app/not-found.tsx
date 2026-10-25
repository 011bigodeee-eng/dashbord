import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
export default function NotFound() {
  return (
    <div className="fatal-error">
      <Activity size={35} />
      <span className="eyebrow">PULSE · 404</span>
      <h1>Este caminho ainda não faz parte da sua rotina.</h1>
      <p>Volte ao centro de performance para continuar.</p>
      <Link href="/" className="button primary">
        Ir para o dashboard
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
