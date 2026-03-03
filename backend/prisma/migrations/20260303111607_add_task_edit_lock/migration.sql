-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
