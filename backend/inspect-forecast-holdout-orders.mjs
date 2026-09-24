import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const orders = await prisma.order.findMany({
    where: {
      status: "completed",
      orderDate: {
        gte: new Date("2026-08-07T00:00:00.000Z"),
        lt: new Date("2026-08-12T00:00:00.000Z")
      }
    },
    select: {
      id: true,
      externalId: true,
      orderDate: true,
      totalAmount: true,
      customer: {
        select: {
          name: true
        }
      },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          product: {
            select: {
              name: true,
              category: true
            }
          }
        }
      }
    },
    orderBy: {
      orderDate: "asc"
    }
  });

  for (const order of orders) {
    console.log("");
    console.log("========================================");
    console.log(`Date: ${order.orderDate.toISOString()}`);
    console.log(`Order: ${order.externalId}`);
    console.log(`Customer: ${order.customer?.name ?? "Unknown"}`);
    console.log(`Total: ?${order.totalAmount}`);

    console.log("Items:");

    for (const item of order.items) {
      console.log(
        `  ${item.product.name} | ${item.product.category ?? "N/A"} | Qty=${item.quantity} | Unit=?${item.unitPrice} | Total=?${item.totalPrice}`
      );
    }
  }

  console.log("");
  console.log(`TOTAL ORDERS: ${orders.length}`);

} finally {
  await prisma.$disconnect();
}
