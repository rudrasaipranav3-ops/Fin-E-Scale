-- AlterTable
ALTER TABLE "sales_forecasts" ADD COLUMN     "evaluationDays" INTEGER,
ADD COLUMN     "smape" DOUBLE PRECISION,
ADD COLUMN     "wape" DOUBLE PRECISION;
