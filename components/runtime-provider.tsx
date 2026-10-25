"use client";
import { createContext, useContext } from "react";
import { HardDrive } from "lucide-react";
const RuntimeContext = createContext(false);
export function RuntimeProvider({
  standalone,
  children,
}: {
  standalone: boolean;
  children: React.ReactNode;
}) {
  return (
    <RuntimeContext.Provider value={standalone}>
      {children}
    </RuntimeContext.Provider>
  );
}
export const useStandaloneMode = () => useContext(RuntimeContext);
export function StandaloneNotice() {
  const standalone = useStandaloneMode();
  if (!standalone) return null;
  return (
    <aside className="standalone-notice" role="status">
      <HardDrive size={19} />
      <div>
        <b>Modo temporário · sem Supabase</b>
        <p>
          Somente dados fictícios. Alterações ficam apenas neste navegador, sem
          sincronização entre dispositivos. Contas reais, convites por e-mail e
          arquivos privados estão pausados.
        </p>
      </div>
    </aside>
  );
}
