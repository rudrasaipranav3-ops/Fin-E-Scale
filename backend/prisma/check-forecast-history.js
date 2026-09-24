import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const userId = "cmsbi0qat0000l8kse16ou29u";

  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: "completed",
    },
    select: {
      id: true,
      externalId: true,
      orderDate: true,
      totalAmount: true,
    },
    orderBy: {
      orderDate: "asc",
    },
  });

  console.log("\nTOTAL COMPLETED ORDERS:", orders.length);

  console.log("\nORDERS:");
  console.table(
    orders.map((order) => ({
      id: order.id,
      externalId: order.externalId,
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
    }))
  );

  const daily = new Map();

  for (const order of orders) {
    const date = new Date(order.orderDate);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const dateKey = date.toISOString().slice(0, 10);

    const existing = daily.get(dateKey) || {
      revenue: 0,
      orders: 0,
    };

    existing.revenue += Number(order.totalAmount) || 0;
    existing.orders += 1;

    daily.set(dateKey, existing);
  }

  console.log("\nDISTINCT ORDER DATES:", daily.size);

  console.log("\nDAILY HISTORY:");
  console.table(
    [...daily.entries()].map(([date, totals]) => ({
      date,
      revenue: Number(totals.revenue.toFixed(2)),
      orders: totals.orders,
    }))
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
