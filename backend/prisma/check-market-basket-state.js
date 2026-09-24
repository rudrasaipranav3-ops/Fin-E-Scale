import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const userId = "cmsbi0qat0000l8kse16ou29u";

  const users = await prisma.user.count();

  const allOrders = await prisma.order.count();

  const userOrders = await prisma.order.count({
    where: { userId }
  });

  const completedOrders = await prisma.order.count({
    where: {
      userId,
      status: "completed"
    }
  });

  console.log({
    users,
    allOrders,
    userOrders,
    completedOrders
  });
} finally {
  await prisma.$disconnect();
}
