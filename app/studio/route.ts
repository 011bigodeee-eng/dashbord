import { NextResponse } from "next/server";
import { isStandaloneMode } from "@/lib/runtime-mode";

/** Native navigation clears only the fictional preview selection, never real auth. */
export async function GET() {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/", "Cache-Control": "private, no-store" },
  });
  if (isStandaloneMode()) response.cookies.delete("md-nation-preview-role");
  return response;
}
