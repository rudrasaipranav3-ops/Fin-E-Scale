import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rows = await prisma.order.findMany({
    select: {
      id: true,
      externalId: true,
      userId: true,
      customerId: true,
      status: true,
      orderDate: true,
      items: {
        select: {
          productId: true,
          quantity: true,
        },
      },
    },
    orderBy: {
      orderDate: "asc",
    },
  });

  console.dir(rows, { depth: null });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
