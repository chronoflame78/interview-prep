-- CreateTable
CREATE TABLE "UserQuestionStar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuestionStar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserQuestionStar_userId_idx" ON "UserQuestionStar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionStar_userId_questionId_key" ON "UserQuestionStar"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "UserQuestionStar" ADD CONSTRAINT "UserQuestionStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionStar" ADD CONSTRAINT "UserQuestionStar_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
