import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const orderIds = [
  "cmsbnie9v0007l8805f2foek6",
  "cmsbnieah000fl880ru3be2ai",
  "cmsbnieap000nl8802uwnuchp",
  "cmsbnieay000vl880o1v39x49",
  "cmsbnieb50013l880oznmdzkw",
];

try {
  const orders = await prisma.order.findMany({
    where: {
      id: {
        in: orderIds,
      },
    },
    select: {
      id: true,
      externalId: true,
      customerId: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      orderDate: "asc",
    },
  });

  console.dir(orders, { depth: null });
} catch (error) {
  console.error("Inspection failed:", error);
} finally {
  await prisma.$disconnect();
}