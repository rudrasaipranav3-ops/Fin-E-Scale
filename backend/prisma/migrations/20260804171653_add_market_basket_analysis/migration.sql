/*
  Warnings:

  - You are about to drop the column `generatedAt` on the `market_basket_rules` table. All the data in the column will be lost.
  - Added the required column `analysisId` to the `market_basket_rules` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "market_basket_rules" DROP CONSTRAINT "market_basket_rules_userId_fkey";

-- DropIndex
DROP INDEX "market_basket_rules_userId_idx";

-- AlterTable
ALTER TABLE "market_basket_rules" DROP COLUMN "generatedAt",
ADD COLUMN     "analysisId" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "market_basket_analysis" (
    "id" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "modelVersion" TEXT,
    "transactionCount" INTEGER NOT NULL,
    "uniqueProductCount" INTEGER NOT NULL,
    "frequentItemsetCount" INTEGER NOT NULL,
    "associationRuleCount" INTEGER NOT NULL,
    "averageConfidence" DOUBLE PRECISION NOT NULL,
    "maximumLift" DOUBLE PRECISION NOT NULL,
    "strongestRule" JSONB,
    "frequentItemsets" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "market_basket_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_basket_analysis_userId_idx" ON "market_basket_analysis"("userId");

-- CreateIndex
CREATE INDEX "market_basket_analysis_generatedAt_idx" ON "market_basket_analysis"("generatedAt");

-- CreateIndex
CREATE INDEX "market_basket_rules_analysisId_idx" ON "market_basket_rules"("analysisId");

-- AddForeignKey
ALTER TABLE "market_basket_rules" ADD CONSTRAINT "market_basket_rules_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "market_basket_analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_basket_rules" ADD CONSTRAINT "market_basket_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_basket_analysis" ADD CONSTRAINT "market_basket_analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
