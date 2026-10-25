/** Temporary default: no database, credentials or external service is required. */
export function isStandaloneMode() {
  return process.env.APP_MODE !== "database";
}
export const standaloneUsers = {
  trainer: {
    id: "local-trainer",
    name: "Alex Morgan",
    email: "personal@mdnation.example",
    demo: true,
    role: "TRAINER" as const,
  },
  student: {
    id: "local-athlete",
    name: "Rafael Martins",
    email: "aluno@mdnation.example",
    demo: true,
    role: "STUDENT" as const,
  },
};
