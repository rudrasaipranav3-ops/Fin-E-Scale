/*
  Warnings:

  - A unique constraint covering the columns `[orderId,productId]` on the table `order_items` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_productId_key" ON "order_items"("orderId", "productId");
