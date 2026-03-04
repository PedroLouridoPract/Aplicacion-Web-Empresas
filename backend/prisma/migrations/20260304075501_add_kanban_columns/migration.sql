-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "attachments" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "reactions" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "customStatus" TEXT;

-- CreateTable
CREATE TABLE "KanbanColumn" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanbanColumn_projectId_position_idx" ON "KanbanColumn"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanColumn_projectId_key_key" ON "KanbanColumn"("projectId", "key");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanColumn" ADD CONSTRAINT "KanbanColumn_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
