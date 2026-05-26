-- DropIndex
DROP INDEX "Topic_name_createdBy_key";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "domainId" TEXT;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "domainId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeDomainId" TEXT;

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Domain_name_key" ON "Domain"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_slug_key" ON "Domain"("slug");

-- CreateIndex
CREATE INDEX "Question_domainId_idx" ON "Question"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_createdBy_domainId_key" ON "Topic"("name", "createdBy", "domainId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeDomainId_fkey" FOREIGN KEY ("activeDomainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
