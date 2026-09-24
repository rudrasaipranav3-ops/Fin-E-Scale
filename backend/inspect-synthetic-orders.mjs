import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { externalId: { startsWith: "FORECAST-" } },
        { externalId: { startsWith: "SEED-" } },
        { externalId: { startsWith: "O10" } }
      ]
    },
    select: {
      externalId: true,
      orderDate: true,
      totalAmount: true,
      status: true
    },
    orderBy: {
      orderDate: "asc"
    }
  });

  console.log("");
  console.log("========================================");
  console.log("SYNTHETIC / TEST ORDERS");
  console.log("========================================");

  for (const order of orders) {
    console.log(
      `${order.orderDate.toISOString()} | ${order.externalId} | ?${order.totalAmount} | ${order.status}`
    );
  }

  console.log("");
  console.log(`TOTAL TEST ORDERS: ${orders.length}`);

} finally {
  await prisma.$disconnect();
}
