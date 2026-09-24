import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rows = await prisma.salesForecast.findMany({
    orderBy: {
      generatedAt: "desc"
    },
    take: 5
  });

  console.dir(rows, { depth: null });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
