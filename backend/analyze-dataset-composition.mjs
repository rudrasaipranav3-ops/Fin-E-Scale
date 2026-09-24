import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const all = await prisma.order.findMany({
    where: {
      status: "completed"
    },
    select: {
      externalId: true,
      orderDate: true,
      totalAmount: true
    }
  });

  const synthetic = all.filter(o =>
    o.externalId.startsWith("FORECAST-") ||
    o.externalId.startsWith("SEED-") ||
    /^O10\d+$/.test(o.externalId)
  );

  const normal = all.filter(o =>
    !(
      o.externalId.startsWith("FORECAST-") ||
      o.externalId.startsWith("SEED-") ||
      /^O10\d+$/.test(o.externalId)
    )
  );

  const sum = rows =>
    rows.reduce((total, row) => total + row.totalAmount, 0);

  console.log("");
  console.log("========================================");
  console.log("DATASET COMPOSITION");
  console.log("========================================");

  console.log(`Total completed orders: ${all.length}`);
  console.log(`Synthetic/test orders:  ${synthetic.length}`);
  console.log(`Other orders:           ${normal.length}`);

  console.log("");
  console.log(`Total revenue:          ?${sum(all).toFixed(2)}`);
  console.log(`Synthetic/test revenue: ?${sum(synthetic).toFixed(2)}`);
  console.log(`Other revenue:          ?${sum(normal).toFixed(2)}`);

  console.log("");
  console.log(
    `Synthetic revenue share: ${(
      (sum(synthetic) / sum(all)) * 100
    ).toFixed(2)}%`
  );

} finally {
  await prisma.$disconnect();
}
