import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      price: true
    },
    orderBy: {
      name: "asc"
    }
  });

  console.dir(products, { depth: null });
} finally {
  await prisma.$disconnect();
}
