CREATE TYPE "UserRole" AS ENUM ('ADMIN','TRAINER','STUDENT');
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'TRAINER';
CREATE TABLE "student_accesses" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
 "trainerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "studentId" TEXT NOT NULL UNIQUE REFERENCES "records"("id") ON DELETE CASCADE,
 "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("trainerId" <> "userId")
);
CREATE INDEX "student_accesses_trainerId_active_idx" ON "student_accesses"("trainerId","active");
CREATE TABLE "portal_invitations" (
 "id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE,
 "trainerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "studentId" TEXT NOT NULL REFERENCES "records"("id") ON DELETE CASCADE,
 "email" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "acceptedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "portal_invitations_trainerId_studentId_idx" ON "portal_invitations"("trainerId","studentId");
CREATE TABLE "workout_sessions" (
 "id" TEXT PRIMARY KEY, "accessId" TEXT NOT NULL REFERENCES "student_accesses"("id") ON DELETE CASCADE,
 "trainingId" TEXT NOT NULL REFERENCES "records"("id") ON DELETE RESTRICT, "snapshot" JSONB NOT NULL,
 "state" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK ("status" IN ('IN_PROGRESS','PAUSED','COMPLETED')),
 "activeSeconds" INTEGER NOT NULL DEFAULT 0 CHECK ("activeSeconds" >= 0),
 "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 "completedAt" TIMESTAMP(3), "feedback" TEXT NOT NULL DEFAULT '', "difficulty" INTEGER CHECK ("difficulty" BETWEEN 1 AND 10)
);
CREATE INDEX "workout_sessions_accessId_status_startedAt_idx" ON "workout_sessions"("accessId","status","startedAt");
CREATE UNIQUE INDEX "one_active_workout_per_student" ON "workout_sessions"("accessId") WHERE "status" <> 'COMPLETED';
CREATE TABLE "assessment_shares" (
 "id" TEXT PRIMARY KEY, "assessmentId" TEXT NOT NULL UNIQUE REFERENCES "records"("id") ON DELETE CASCADE,
 "fields" TEXT[] NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "portal_messages" (
 "id" TEXT PRIMARY KEY, "trainerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "studentId" TEXT NOT NULL REFERENCES "records"("id") ON DELETE CASCADE,
 "title" TEXT NOT NULL, "body" TEXT NOT NULL, "category" TEXT NOT NULL,
 "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "portal_messages_trainerId_studentId_createdAt_idx" ON "portal_messages"("trainerId","studentId","createdAt");
CREATE TABLE "reschedule_requests" (
 "id" TEXT PRIMARY KEY, "accessId" TEXT NOT NULL REFERENCES "student_accesses"("id") ON DELETE CASCADE,
 "appointmentId" TEXT NOT NULL REFERENCES "records"("id") ON DELETE CASCADE,
 "date" TEXT NOT NULL, "time" TEXT NOT NULL, "reason" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','APPROVED','DECLINED')),
 "response" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "decidedAt" TIMESTAMP(3)
);
CREATE INDEX "reschedule_requests_accessId_status_idx" ON "reschedule_requests"("accessId","status");
CREATE UNIQUE INDEX "one_pending_reschedule" ON "reschedule_requests"("appointmentId") WHERE "status"='PENDING';
