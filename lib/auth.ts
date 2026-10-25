import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32)
    throw new Error("AUTH_SECRET precisa ter pelo menos 32 caracteres");
  return new TextEncoder().encode(s);
}
export async function session() {
  const token = (await cookies()).get("pulse-session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "pulse",
    });
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, demo: true },
    });
    return user?.demo && process.env.DEMO_MODE !== "true" ? null : user;
  } catch {
    return null;
  }
}
export async function signIn(id: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id)
    .setIssuer("pulse")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
  (await cookies()).set("pulse-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 43200,
  });
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const target = new URL(req.url);
    return (
      source.protocol === target.protocol &&
      source.host === (req.headers.get("host") || target.host)
    );
  } catch {
    return false;
  }
}
