import prisma from "./src/lib/prisma.js";
import { generateForecastNotifications } from "./src/services/notification.service.js";

const TEST_TITLE = `Concurrency Test ${Date.now()}`;
const TEST_METRIC = "notification-concurrency-test";

try {
  const user = await prisma.user.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    throw new Error("No user exists in the database. Create/login with a user first.");
  }

  console.log("Testing with user:", user.id);
  console.log("Test title:", TEST_TITLE);

  const businessInsights = {
    riskAlerts: [
      {
        level: "medium",
        type: TEST_METRIC,
        title: TEST_TITLE,
        message: "Concurrency-safe notification test.",
      },
    ],
    recommendations: [],
  };

  console.log("\nStarting two concurrent notification-generation calls...");

  const [first, second] = await Promise.all([
    generateForecastNotifications({
      userId: user.id,
      businessInsights,
      forecastExplainability: [],
    }),
    generateForecastNotifications({
      userId: user.id,
      businessInsights,
      forecastExplainability: [],
    }),
  ]);

  console.log("\nFirst call result:");
  console.log(first);

  console.log("\nSecond call result:");
  console.log(second);

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      type: "risk",
      title: TEST_TITLE,
      relatedMetric: TEST_METRIC,
      relatedDate: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const totalCreated =
  (Array.isArray(first?.created) ? first.created.length : 0) +
  (Array.isArray(second?.created) ? second.created.length : 0);

  console.log("\n========== CONCURRENCY TEST ==========");
  console.log("Notifications found:", notifications.length);
  console.log("Total notifications created:", totalCreated);
  console.log("First call created:", first.created.length);
  console.log("First call skipped:", first.skipped.length);
  console.log("Second call created:", second.created.length);
  console.log("Second call skipped:", second.skipped.length);

  if (notifications.length !== 1) {
    throw new Error(
      `FAIL: Expected exactly 1 notification, found ${notifications.length}.`
    );
  }

  if (totalCreated !== 1) {
    throw new Error(
      `FAIL: Expected exactly 1 notification creation, got ${totalCreated}.`
    );
  }

  console.log("PASS: Exactly one notification exists.");
  console.log("PASS: Exactly one concurrent call created it.");
  console.log("PASS: Deduplication is concurrency-safe.");

  await prisma.notification.deleteMany({
    where: {
      userId: user.id,
      title: TEST_TITLE,
      relatedMetric: TEST_METRIC,
    },
  });

  console.log("PASS: Test notification cleaned up.");
} catch (error) {
  console.error("\nCONCURRENCY TEST FAILED:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}