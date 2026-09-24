import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const result = await prisma.$queryRaw`
    SELECT
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'market_basket_analysis'
    ORDER BY ordinal_position;
  `;

  console.table(result);
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
