import prisma from "../src/lib/prisma.js";

const API_URL = "http://127.0.0.1:5001";
const EMAIL = "test@example.com";
const PASSWORD = process.env.E2E_TEST_PASSWORD;

if (!PASSWORD) {
  console.error(
    "Missing E2E_TEST_PASSWORD environment variable."
  );
  process.exit(1);
}

const USER_ID = "cmsbi0qat0000l8kse16ou29u";

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return null;

  const match = setCookieHeader.match(
    /auth_token=([^;]+)/
  );

  return match ? match[1] : null;
}

async function main() {
  console.log("\n=== E2E FORECAST + NOTIFICATION TEST ===\n");

  // -------------------------------------------------------
  // 1. Verify test user
  // -------------------------------------------------------

  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
    select: {
      id: true,
      email: true,
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(
      `Test user ${USER_ID} was not found.`
    );
  }

  console.log("✓ Test user:", user.email);
  console.log("✓ Total orders:", user._count.orders);

  // -------------------------------------------------------
  // 2. Verify completed history
  // -------------------------------------------------------

  const historyStart = new Date();
  historyStart.setUTCHours(0, 0, 0, 0);
  historyStart.setUTCDate(
    historyStart.getUTCDate() - 89
  );

  const orders = await prisma.order.findMany({
    where: {
      userId: USER_ID,
      status: "completed",
      orderDate: {
        gte: historyStart,
      },
    },
    select: {
      orderDate: true,
    },
  });

  const distinctDays = new Set(
    orders.map((order) =>
      new Date(order.orderDate)
        .toISOString()
        .slice(0, 10)
    )
  );

  console.log(
    "✓ 90-day completed orders:",
    orders.length
  );

  console.log(
    "✓ Distinct history days:",
    distinctDays.size
  );

  if (distinctDays.size < 7) {
    throw new Error(
      "Insufficient daily history for forecast."
    );
  }

  // -------------------------------------------------------
  // 3. Login
  // -------------------------------------------------------

  console.log("\nLogging in...");

  const loginResponse = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
      }),
    }
  );

  const loginBody =
    await loginResponse.json();

  if (!loginResponse.ok) {
    throw new Error(
      `Login failed (${loginResponse.status}): ${JSON.stringify(
        loginBody
      )}`
    );
  }

  if (!loginBody.authenticated) {
    throw new Error(
      "Login response did not authenticate the user."
    );
  }

  const setCookie =
    loginResponse.headers.get("set-cookie");

  const authToken =
    extractCookie(setCookie);

  if (!authToken) {
    throw new Error(
      "Login succeeded but auth_token cookie was not returned."
    );
  }

  console.log("✓ Login successful");
  console.log("✓ auth_token cookie captured");

  const cookieHeader =
    `auth_token=${authToken}`;

  // -------------------------------------------------------
  // 4. Verify /me using the cookie
  // -------------------------------------------------------

  const meResponse = await fetch(
    `${API_URL}/api/auth/me`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: cookieHeader,
      },
    }
  );

  const meBody =
    await meResponse.json();

  if (!meResponse.ok) {
    throw new Error(
      `/auth/me failed (${meResponse.status}): ${JSON.stringify(
        meBody
      )}`
    );
  }

  console.log("✓ /auth/me authenticated:", meBody.user?.email);

  // -------------------------------------------------------
  // 5. Run V4.1 forecast
  // -------------------------------------------------------

  console.log("\nRunning 7-day V4.1 forecast...");

  const forecastResponse = await fetch(
    `${API_URL}/api/analytics/forecasting/run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        horizon: 7,
      }),
    }
  );

  const forecastBody =
    await forecastResponse.json();

  console.log(
    "Forecast HTTP status:",
    forecastResponse.status
  );

  console.log(
    "Forecast response:",
    JSON.stringify(
      forecastBody,
      null,
      2
    )
  );

  if (!forecastResponse.ok) {
    throw new Error(
      "Forecast endpoint failed."
    );
  }

  if (!forecastBody.success) {
    throw new Error(
      "Forecast endpoint returned success=false."
    );
  }

  console.log("✓ Forecast generated");

  // -------------------------------------------------------
  // 6. Inspect resulting notifications
  // -------------------------------------------------------

  const beforeNotifications =
    await prisma.notification.findMany({
      where: {
        userId: USER_ID,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        type: true,
        priority: true,
        title: true,
        relatedMetric: true,
        relatedDate: true,
        createdAt: true,
      },
    });

  console.log(
    "\nRecent notifications:",
    beforeNotifications.length
  );

  for (const notification of beforeNotifications) {
    console.log(
      `  ${notification.type} | ${notification.priority} | ${notification.title}`
    );
  }

  console.log(
    "\n=== FORECAST E2E TEST PASSED ==="
  );
}

main()
  .catch((error) => {
    console.error(
      "\n=== E2E TEST FAILED ==="
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });