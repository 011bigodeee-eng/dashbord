CREATE TABLE "private_files" (
 "id" TEXT PRIMARY KEY,
 "trainerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "studentId" TEXT NOT NULL REFERENCES "records"("id") ON DELETE RESTRICT,
 "type" TEXT NOT NULL CHECK ("type" IN ('photo','document')),
 "name" TEXT NOT NULL,
 "mime" TEXT NOT NULL,
 "date" TEXT NOT NULL,
 "consent" BOOLEAN NOT NULL DEFAULT false,
 "bytes" BYTEA NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (octet_length("bytes") <= 5242880),
 CHECK ("type" <> 'photo' OR "consent" = true)
);
CREATE INDEX "private_files_trainerId_studentId_idx" ON "private_files"("trainerId","studentId");
