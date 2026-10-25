import { NextResponse } from "next/server";
export function servicePaused() {
  return NextResponse.json(
    {
      error:
        "Serviço conectado temporariamente pausado. Use a demonstração local; nenhum dado foi enviado ao banco.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
