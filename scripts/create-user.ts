import "dotenv/config";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "../lib/db";
const input = z
  .object({
    email: z.email(),
    name: z.string().min(2),
    password: z.string().min(12),
  })
  .parse({
    email: process.env.PULSE_USER_EMAIL,
    name: process.env.PULSE_USER_NAME,
    password: process.env.PULSE_USER_PASSWORD,
  });
try {
  await db.user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: await hash(input.password, 12),
      demo: false,
    },
  });
  console.log("Profissional criado. Faça login com o e-mail configurado.");
} finally {
  await db.$disconnect();
}
