-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "description" TEXT,
    "fileName" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPurchaseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "datasetId" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "subCategory" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "brand" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "datasetId" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "channel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "datasetId" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_segments" (
    "id" TEXT NOT NULL,
    "segmentName" TEXT NOT NULL,
    "clusterNumber" INTEGER NOT NULL,
    "description" TEXT,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "customer_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "churn_predictions" (
    "id" TEXT NOT NULL,
    "churnProbability" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "predictedChurn" BOOLEAN NOT NULL,
    "modelVersion" TEXT,
    "predictionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "churn_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clv_predictions" (
    "id" TEXT NOT NULL,
    "predictedValue" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "modelVersion" TEXT,
    "predictionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "clv_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recommendations" (
    "id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'collaborative_filtering',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "product_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_basket_rules" (
    "id" TEXT NOT NULL,
    "antecedent" JSONB NOT NULL,
    "consequent" JSONB NOT NULL,
    "support" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "market_basket_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_forecasts" (
    "id" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "predictedRevenue" DOUBLE PRECISION NOT NULL,
    "predictedOrders" INTEGER,
    "lowerBound" DOUBLE PRECISION,
    "upperBound" DOUBLE PRECISION,
    "modelVersion" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sales_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "datasets_userId_idx" ON "datasets"("userId");

-- CreateIndex
CREATE INDEX "datasets_status_idx" ON "datasets"("status");

-- CreateIndex
CREATE INDEX "customers_userId_idx" ON "customers"("userId");

-- CreateIndex
CREATE INDEX "customers_datasetId_idx" ON "customers"("datasetId");

-- CreateIndex
CREATE INDEX "customers_country_idx" ON "customers"("country");

-- CreateIndex
CREATE UNIQUE INDEX "customers_userId_externalId_key" ON "customers"("userId", "externalId");

-- CreateIndex
CREATE INDEX "products_userId_idx" ON "products"("userId");

-- CreateIndex
CREATE INDEX "products_datasetId_idx" ON "products"("datasetId");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE UNIQUE INDEX "products_userId_externalId_key" ON "products"("userId", "externalId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_datasetId_idx" ON "orders"("datasetId");

-- CreateIndex
CREATE INDEX "orders_orderDate_idx" ON "orders"("orderDate");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_userId_externalId_key" ON "orders"("userId", "externalId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "customer_segments_userId_idx" ON "customer_segments"("userId");

-- CreateIndex
CREATE INDEX "customer_segments_customerId_idx" ON "customer_segments"("customerId");

-- CreateIndex
CREATE INDEX "customer_segments_clusterNumber_idx" ON "customer_segments"("clusterNumber");

-- CreateIndex
CREATE INDEX "churn_predictions_userId_idx" ON "churn_predictions"("userId");

-- CreateIndex
CREATE INDEX "churn_predictions_customerId_idx" ON "churn_predictions"("customerId");

-- CreateIndex
CREATE INDEX "churn_predictions_riskLevel_idx" ON "churn_predictions"("riskLevel");

-- CreateIndex
CREATE INDEX "churn_predictions_predictionDate_idx" ON "churn_predictions"("predictionDate");

-- CreateIndex
CREATE INDEX "clv_predictions_userId_idx" ON "clv_predictions"("userId");

-- CreateIndex
CREATE INDEX "clv_predictions_customerId_idx" ON "clv_predictions"("customerId");

-- CreateIndex
CREATE INDEX "clv_predictions_predictionDate_idx" ON "clv_predictions"("predictionDate");

-- CreateIndex
CREATE INDEX "product_recommendations_userId_idx" ON "product_recommendations"("userId");

-- CreateIndex
CREATE INDEX "product_recommendations_customerId_idx" ON "product_recommendations"("customerId");

-- CreateIndex
CREATE INDEX "product_recommendations_productId_idx" ON "product_recommendations"("productId");

-- CreateIndex
CREATE INDEX "product_recommendations_score_idx" ON "product_recommendations"("score");

-- CreateIndex
CREATE INDEX "market_basket_rules_userId_idx" ON "market_basket_rules"("userId");

-- CreateIndex
CREATE INDEX "market_basket_rules_lift_idx" ON "market_basket_rules"("lift");

-- CreateIndex
CREATE INDEX "sales_forecasts_userId_idx" ON "sales_forecasts"("userId");

-- CreateIndex
CREATE INDEX "sales_forecasts_forecastDate_idx" ON "sales_forecasts"("forecastDate");

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "churn_predictions" ADD CONSTRAINT "churn_predictions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "churn_predictions" ADD CONSTRAINT "churn_predictions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clv_predictions" ADD CONSTRAINT "clv_predictions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clv_predictions" ADD CONSTRAINT "clv_predictions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_basket_rules" ADD CONSTRAINT "market_basket_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_forecasts" ADD CONSTRAINT "sales_forecasts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
