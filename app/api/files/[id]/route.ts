import { isStandaloneMode } from "@/lib/runtime-mode";
import { servicePaused } from "@/lib/service-paused";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { session, trainerSession, checkOrigin } from "@/lib/auth";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isStandaloneMode()) return servicePaused();
  const user = await session();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await params;
  const file = await db.privateFile.findFirst({
    where:
      user.role === "STUDENT"
        ? {
            id,
            trainerId: (
              await db.studentAccess.findUniqueOrThrow({
                where: { userId: user.id },
              })
            ).trainerId,
            studentId: (
              await db.studentAccess.findUniqueOrThrow({
                where: { userId: user.id },
              })
            ).studentId,
            type: "photo",
            consent: true,
          }
        : { id, trainerId: user.id },
  });
  if (!file) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${file.type === "photo" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (isStandaloneMode()) return servicePaused();
  if (!checkOrigin(req)) return new Response(null, { status: 403 });
  const user = await trainerSession();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await params;
  const result = await db.privateFile.deleteMany({
    where: { id, trainerId: user.id },
  });
  return NextResponse.json(
    { ok: result.count === 1 },
    { status: result.count ? 200 : 404 },
  );
}
