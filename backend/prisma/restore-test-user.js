import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_ID = "cmsbi0qat0000l8kse16ou29u";
const EMAIL = "test@example.com";
const PASSWORD = "Test@12345";

try {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      id: USER_ID,
      name: "Test User",
      email: EMAIL,
      passwordHash,
      role: "user",
      isVerified: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
    },
  });

  console.log("User recreated successfully:");
  console.dir(user, { depth: null });
} catch (error) {
  console.error("Failed to recreate user:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
