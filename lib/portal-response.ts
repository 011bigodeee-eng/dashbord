import { NextResponse } from "next/server";
import { PortalError } from "./portal";
export function portalFailure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof PortalError
          ? error.message
          : "Não foi possível concluir a operação. Tente novamente.",
    },
    { status: error instanceof PortalError ? error.status : 500 },
  );
}
