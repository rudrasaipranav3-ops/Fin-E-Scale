-- AlterTable
ALTER TABLE "churn_predictions" ADD COLUMN     "datasetId" TEXT;

-- AlterTable
ALTER TABLE "clv_predictions" ADD COLUMN     "datasetId" TEXT;

-- AlterTable
ALTER TABLE "customer_segments" ADD COLUMN     "datasetId" TEXT;

-- AlterTable
ALTER TABLE "market_basket_analysis" ADD COLUMN     "datasetId" TEXT;

-- AlterTable
ALTER TABLE "product_recommendations" ADD COLUMN     "datasetId" TEXT,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "sales_forecasts" ADD COLUMN     "algorithm" TEXT,
ADD COLUMN     "datasetId" TEXT,
ADD COLUMN     "mae" DOUBLE PRECISION,
ADD COLUMN     "mape" DOUBLE PRECISION,
ADD COLUMN     "rmse" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "churn_predictions_datasetId_idx" ON "churn_predictions"("datasetId");

-- CreateIndex
CREATE INDEX "clv_predictions_datasetId_idx" ON "clv_predictions"("datasetId");

-- CreateIndex
CREATE INDEX "customer_segments_datasetId_idx" ON "customer_segments"("datasetId");

-- CreateIndex
CREATE INDEX "market_basket_analysis_datasetId_idx" ON "market_basket_analysis"("datasetId");

-- CreateIndex
CREATE INDEX "market_basket_rules_userId_idx" ON "market_basket_rules"("userId");

-- CreateIndex
CREATE INDEX "product_recommendations_datasetId_idx" ON "product_recommendations"("datasetId");

-- CreateIndex
CREATE INDEX "sales_forecasts_datasetId_idx" ON "sales_forecasts"("datasetId");

-- AddForeignKey
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "churn_predictions" ADD CONSTRAINT "churn_predictions_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clv_predictions" ADD CONSTRAINT "clv_predictions_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_basket_analysis" ADD CONSTRAINT "market_basket_analysis_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_forecasts" ADD CONSTRAINT "sales_forecasts_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
