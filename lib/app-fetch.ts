"use client";
import { localDemoFetch } from "./local-demo-api";
/** Only fictional browser-local data is handled here. Real auth always uses the server. */
export function appFetch(input: string, init?: RequestInit): Promise<Response> {
  if (
    typeof document !== "undefined" &&
    document.documentElement.dataset.appMode === "standalone" &&
    /^\/api\/(data|studio|athlete|invitations|files)(\/|\?|$)/.test(input)
  )
    return localDemoFetch(input, init);
  return fetch(input, init);
}
