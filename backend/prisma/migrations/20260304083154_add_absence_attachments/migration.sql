-- CreateTable
CREATE TABLE "AbsenceAttachment" (
    "id" TEXT NOT NULL,
    "absenceId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbsenceAttachment_absenceId_idx" ON "AbsenceAttachment"("absenceId");

-- AddForeignKey
ALTER TABLE "AbsenceAttachment" ADD CONSTRAINT "AbsenceAttachment_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "Absence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
