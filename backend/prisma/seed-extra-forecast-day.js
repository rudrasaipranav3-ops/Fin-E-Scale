import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*
 * Change this if 2026-08-09 already exists as a completed
 * order date for your test user (unlikely, but check the
 * output of check-forecast-history.js first).
 */
const NEW_ORDER_DATE = "2026-08-09";

try {
  const user = await prisma.user.findFirst({
    where: { email: "test@example.com" },
  });

  if (!user) {
    throw new Error("test@example.com user not found.");
  }

  const customer = await prisma.customer.findFirst({
    where: { userId: user.id },
  });

  const product = await prisma.product.findFirst({
    where: { userId: user.id },
  });

  if (!customer || !product) {
    throw new Error(
      "No existing customer/product found for this user. Upload a dataset first."
    );
  }

  const quantity = 2;
  const unitPrice = product.price;
  const totalPrice = quantity * unitPrice;

  const order = await prisma.order.create({
    data: {
      externalId: `SEED-EXTRA-${Date.now()}`,
      orderDate: new Date(NEW_ORDER_DATE),
      status: "completed",
      totalAmount: totalPrice,
      userId: user.id,
      customerId: customer.id,
      items: {
        create: {
          quantity,
          unitPrice,
          totalPrice,
          productId: product.id,
        },
      },
    },
    include: { items: true },
  });

  console.log("Created extra order:", order);
} catch (error) {
  console.error("Seed failed:", error);
} finally {
  await prisma.$disconnect();
}