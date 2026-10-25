import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/lib/brand";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
export default function NotFound() {
  return (
    <div className="fatal-error">
      <BrandMark className="error-brand-artwork" />
      <span className="eyebrow">{brand.wordmark} · 404</span>
      <h1>Este caminho ainda não faz parte da sua rotina.</h1>
      <p>Volte ao centro de performance para continuar.</p>
      <Link href="/" className="button primary">
        Ir para o dashboard
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
