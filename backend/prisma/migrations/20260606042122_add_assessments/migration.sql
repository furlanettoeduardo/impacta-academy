-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('OBJETIVA', 'DISSERTATIVA');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDENTE', 'CORRIGIDA');

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "averageGrade" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "assessmentsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minAverage" DOUBLE PRECISION NOT NULL DEFAULT 7,
ADD COLUMN     "requireAverageForCertificate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Assessment" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "courseId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "type" "QuestionType" NOT NULL,
    "statement" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSubmission" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDENTE',
    "grade" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "selectedOptionId" UUID,
    "text" TEXT,
    "earnedPoints" DOUBLE PRECISION,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assessment_courseId_idx" ON "Assessment"("courseId");

-- CreateIndex
CREATE INDEX "Question_assessmentId_idx" ON "Question"("assessmentId");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentSubmission_userId_idx" ON "AssessmentSubmission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSubmission_assessmentId_userId_key" ON "AssessmentSubmission"("assessmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_submissionId_questionId_key" ON "Answer"("submissionId", "questionId");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssessmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "QuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
