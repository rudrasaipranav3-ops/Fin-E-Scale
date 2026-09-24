import { PrismaClient } from "@prisma/client";

/*
|--------------------------------------------------------------------------
| PRISMA CLIENT
|--------------------------------------------------------------------------
|
| Create a single Prisma Client instance for the backend.
|
*/

const prisma = new PrismaClient();

/*
|--------------------------------------------------------------------------
| GRACEFUL DATABASE DISCONNECT
|--------------------------------------------------------------------------
*/

const shutdown = async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error(
      "Error disconnecting Prisma:",
      error
    );
  }
};

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default prisma;