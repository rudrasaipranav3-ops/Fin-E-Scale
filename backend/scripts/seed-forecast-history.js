import prisma from "../src/lib/prisma.js";

const USER_ID = "cmsbi0qat0000l8kse16ou29u";

const HISTORY_DAYS = 90;

// Existing database already contains orders.
// We will only create historical data for dates that
// don't already have completed orders.
const PRODUCT_DEFINITIONS = [
  {
    externalId: "FORECAST-PROD-001",
    name: "Analytics Pro",
    category: "Software",
    subCategory: "Analytics",
    price: 7999,
    cost: 4200,
    brand: "InsightWorks",
  },
  {
    externalId: "FORECAST-PROD-002",
    name: "Business Intelligence Suite",
    category: "Software",
    subCategory: "Business Intelligence",
    price: 12999,
    cost: 6800,
    brand: "InsightWorks",
  },
  {
    externalId: "FORECAST-PROD-003",
    name: "Data Visualization Pack",
    category: "Software",
    subCategory: "Visualization",
    price: 4999,
    cost: 2300,
    brand: "InsightWorks",
  },
  {
    externalId: "FORECAST-PROD-004",
    name: "Predictive Analytics",
    category: "Software",
    subCategory: "Machine Learning",
    price: 15999,
    cost: 8500,
    brand: "InsightWorks",
  },
  {
    externalId: "FORECAST-PROD-005",
    name: "Enterprise Dashboard",
    category: "Software",
    subCategory: "Dashboard",
    price: 21999,
    cost: 11500,
    brand: "InsightWorks",
  },
];

const CUSTOMER_DEFINITIONS = [
  {
    externalId: "FORECAST-CUST-001",
    name: "Aarav Sharma",
    email: "aarav.forecast@example.com",
    phone: "+919900000001",
    city: "Hyderabad",
    country: "India",
    age: 29,
  },
  {
    externalId: "FORECAST-CUST-002",
    name: "Ananya Reddy",
    email: "ananya.forecast@example.com",
    phone: "+919900000002",
    city: "Bengaluru",
    country: "India",
    age: 31,
  },
  {
    externalId: "FORECAST-CUST-003",
    name: "Vikram Rao",
    email: "vikram.forecast@example.com",
    phone: "+919900000003",
    city: "Chennai",
    country: "India",
    age: 35,
  },
  {
    externalId: "FORECAST-CUST-004",
    name: "Ishita Mehta",
    email: "ishita.forecast@example.com",
    phone: "+919900000004",
    city: "Mumbai",
    country: "India",
    age: 27,
  },
  {
    externalId: "FORECAST-CUST-005",
    name: "Rohan Kapoor",
    email: "rohan.forecast@example.com",
    phone: "+919900000005",
    city: "Delhi",
    country: "India",
    age: 33,
  },
  {
    externalId: "FORECAST-CUST-006",
    name: "Meera Nair",
    email: "meera.forecast@example.com",
    phone: "+919900000006",
    city: "Kochi",
    country: "India",
    age: 30,
  },
  {
    externalId: "FORECAST-CUST-007",
    name: "Aditya Verma",
    email: "aditya.forecast@example.com",
    phone: "+919900000007",
    city: "Pune",
    country: "India",
    age: 36,
  },
  {
    externalId: "FORECAST-CUST-008",
    name: "Sneha Iyer",
    email: "sneha.forecast@example.com",
    phone: "+919900000008",
    city: "Hyderabad",
    country: "India",
    age: 28,
  },
];

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(
    randomBetween(min, max + 1)
  );
}

function choose(array) {
  return array[
    Math.floor(Math.random() * array.length)
  ];
}

function utcDate(daysAgo) {
  const date = new Date();

  date.setUTCHours(
    12,
    0,
    0,
    0
  );

  date.setUTCDate(
    date.getUTCDate() - daysAgo
  );

  return date;
}

function dateKey(date) {
  return date
    .toISOString()
    .slice(0, 10);
}

/*
 * Weekly seasonality:
 *
 * Monday       baseline
 * Tuesday      baseline
 * Wednesday    baseline
 * Thursday     slightly higher
 * Friday       highest
 * Saturday     moderately high
 * Sunday       lower
 *
 * This gives the forecasting model actual
 * weekly structure to learn.
 */
function weekdayMultiplier(date) {
  const day = date.getUTCDay();

  switch (day) {
    case 0:
      return 0.72; // Sunday

    case 1:
      return 0.92; // Monday

    case 2:
      return 1.00; // Tuesday

    case 3:
      return 1.05; // Wednesday

    case 4:
      return 1.12; // Thursday

    case 5:
      return 1.28; // Friday

    case 6:
      return 1.08; // Saturday

    default:
      return 1;
  }
}

/*
 * Gradual business growth through the historical period.
 *
 * Older days have lower revenue.
 * More recent days have moderately higher revenue.
 */
function trendMultiplier(daysAgo) {
  const progress =
    (HISTORY_DAYS - daysAgo) /
    HISTORY_DAYS;

  return 0.82 + progress * 0.28;
}

/*
 * Occasionally create a promotion/event spike.
 *
 * These spikes are deliberately limited so that
 * the robust forecasting model has realistic
 * outliers to suppress.
 */
function eventMultiplier() {
  const probability = Math.random();

  if (probability < 0.07) {
    return randomBetween(1.45, 1.85);
  }

  if (probability < 0.18) {
    return randomBetween(1.10, 1.30);
  }

  return 1;
}

/*
 * Some calendar days intentionally have no order.
 *
 * This is important because the forecasting pipeline
 * needs both:
 *
 * observed sales days
 * and
 * genuine zero-order calendar days.
 *
 * Target: roughly 50-65 active days out of 90.
 */
function shouldHaveOrders(date) {
  const day = date.getUTCDay();

  let probability = 0.67;

  if (day === 0) {
    probability = 0.48;
  }

  if (day === 6) {
    probability = 0.72;
  }

  return Math.random() < probability;
}

async function main() {
  console.log(
    "=============================================="
  );

  console.log(
    "90-DAY FORECAST HISTORY SEED"
  );

  console.log(
    "=============================================="
  );

  const user = await prisma.user.findUnique({
    where: {
      id: USER_ID,
    },
  });

  if (!user) {
    throw new Error(
      `User ${USER_ID} was not found.`
    );
  }

  console.log(
    `User: ${user.name} (${user.email})`
  );

  // ----------------------------------------------------
  // PRODUCTS
  // ----------------------------------------------------

  const products = [];

  for (const definition of PRODUCT_DEFINITIONS) {
    const product =
      await prisma.product.upsert({
        where: {
          userId_externalId: {
            userId: USER_ID,
            externalId:
              definition.externalId,
          },
        },

        update: {
          name: definition.name,
          category: definition.category,
          subCategory:
            definition.subCategory,
          price: definition.price,
          cost: definition.cost,
          brand: definition.brand,
        },

        create: {
          externalId:
            definition.externalId,

          name: definition.name,

          category:
            definition.category,

          subCategory:
            definition.subCategory,

          description:
            `Forecasting seed product - ${definition.name}`,

          price:
            definition.price,

          cost:
            definition.cost,

          stock: 1000,

          brand:
            definition.brand,

          userId: USER_ID,
        },
      });

    products.push(product);
  }

  console.log(
    `Products ready: ${products.length}`
  );

  // ----------------------------------------------------
  // CUSTOMERS
  // ----------------------------------------------------

  const customers = [];

  for (const definition of CUSTOMER_DEFINITIONS) {
    const customer =
      await prisma.customer.upsert({
        where: {
          userId_externalId: {
            userId: USER_ID,
            externalId:
              definition.externalId,
          },
        },

        update: {
          name: definition.name,
          email: definition.email,
          phone: definition.phone,
          city: definition.city,
          country: definition.country,
          age: definition.age,
        },

        create: {
          externalId:
            definition.externalId,

          name:
            definition.name,

          email:
            definition.email,

          phone:
            definition.phone,

          city:
            definition.city,

          country:
            definition.country,

          age:
            definition.age,

          userId: USER_ID,
        },
      });

    customers.push(customer);
  }

  console.log(
    `Customers ready: ${customers.length}`
  );

  // ----------------------------------------------------
  // EXISTING COMPLETED ORDERS
  // ----------------------------------------------------

  const existingOrders =
    await prisma.order.findMany({
      where: {
        userId: USER_ID,
        status: "completed",
      },

      select: {
        orderDate: true,
      },
    });

  const existingDateKeys =
    new Set(
      existingOrders.map(
        (order) =>
          dateKey(order.orderDate)
      )
    );

  console.log(
    `Existing completed orders: ${existingOrders.length}`
  );

  console.log(
    `Existing observed dates: ${existingDateKeys.size}`
  );

  // ----------------------------------------------------
  // SEED 90 DAYS
  // ----------------------------------------------------

  let createdOrders = 0;
  let skippedExistingDays = 0;
  let zeroOrderDays = 0;
  let totalRevenue = 0;

  for (
    let daysAgo = HISTORY_DAYS - 1;
    daysAgo >= 0;
    daysAgo--
  ) {
    const orderDate =
      utcDate(daysAgo);

    const key =
      dateKey(orderDate);

    /*
     * Never overwrite or duplicate an existing
     * completed sales day.
     */
    if (existingDateKeys.has(key)) {
      skippedExistingDays++;
      continue;
    }

    /*
     * Intentionally leave some days without orders.
     */
    if (!shouldHaveOrders(orderDate)) {
      zeroOrderDays++;
      continue;
    }

    const weekly =
      weekdayMultiplier(orderDate);

    const trend =
      trendMultiplier(daysAgo);

    const event =
      eventMultiplier();

    /*
     * Base daily revenue.
     *
     * This is intentionally large enough to make
     * the forecasting model meaningful relative
     * to the existing ₹65k/₹130k transactions.
     */
    const baseRevenue =
      randomBetween(
        18000,
        42000
      );

    const dailyRevenue =
      baseRevenue *
      weekly *
      trend *
      event;

    /*
     * 1-3 orders per active day.
     */
    let orderCount;

    if (dailyRevenue > 60000) {
      orderCount =
        randomInt(3, 4);
    } else if (dailyRevenue > 35000) {
      orderCount =
        randomInt(2, 3);
    } else {
      orderCount =
        randomInt(1, 2);
    }

    let remainingRevenue =
      dailyRevenue;

    for (
      let orderIndex = 0;
      orderIndex < orderCount;
      orderIndex++
    ) {
      const customer =
        choose(customers);

      const product =
        choose(products);

      const isLast =
        orderIndex ===
        orderCount - 1;

      let orderAmount;

      if (isLast) {
        orderAmount =
          remainingRevenue;
      } else {
        const minimumRemaining =
          (orderCount -
            orderIndex -
            1) *
          5000;

        const maximumCurrent =
          Math.max(
            5000,
            remainingRevenue -
              minimumRemaining
          );

        orderAmount =
          randomBetween(
            5000,
            maximumCurrent
          );
      }

      orderAmount =
        Math.max(
          1000,
          round(orderAmount)
        );

      remainingRevenue =
        Math.max(
          0,
          remainingRevenue -
            orderAmount
        );

      const externalId =
        `FORECAST-${key}-${orderIndex + 1}`;

      const discount =
        round(
          orderAmount *
            randomBetween(
              0,
              0.08
            )
        );

      const shippingCost =
        round(
          randomBetween(
            0,
            750
          )
        );

      const paymentMethods = [
        "UPI",
        "card",
        "netbanking",
        "cash",
      ];

      const channels = [
        "web",
        "mobile",
        "direct",
      ];

      const createdOrder =
        await prisma.order.create({
          data: {
            externalId,

            orderDate,

            status:
              "completed",

            totalAmount:
              orderAmount,

            discount,

            shippingCost,

            paymentMethod:
              choose(
                paymentMethods
              ),

            channel:
              choose(channels),

            user: {
              connect: {
                id: USER_ID,
              },
            },

            customer: {
              connect: {
                id: customer.id,
              },
            },

            items: {
              create: [
                {
                  quantity: 1,

                  unitPrice:
                    orderAmount,

                  discount: 0,

                  totalPrice:
                    orderAmount,

                  product: {
                    connect: {
                      id: product.id,
                    },
                  },
                },
              ],
            },
          },

          select: {
            id: true,
            totalAmount: true,
          },
        });

      createdOrders++;

      totalRevenue +=
        createdOrder.totalAmount;
    }
  }

  // ----------------------------------------------------
  // UPDATE CUSTOMER AGGREGATES
  // ----------------------------------------------------

  for (const customer of customers) {
    const customerOrders =
      await prisma.order.findMany({
        where: {
          userId: USER_ID,
          customerId:
            customer.id,
          status:
            "completed",
        },

        select: {
          totalAmount: true,
          orderDate: true,
        },
      });

    const totalOrders =
      customerOrders.length;

    const totalSpent =
      customerOrders.reduce(
        (sum, order) =>
          sum +
          order.totalAmount,
        0
      );

    const lastPurchase =
      customerOrders.length
        ? customerOrders.reduce(
            (latest, order) =>
              order.orderDate >
              latest
                ? order.orderDate
                : latest,
            customerOrders[0]
              .orderDate
          )
        : null;

    await prisma.customer.update({
      where: {
        id: customer.id,
      },

      data: {
        totalOrders,

        totalSpent:
          round(totalSpent),

        averageOrderValue:
          totalOrders > 0
            ? round(
                totalSpent /
                  totalOrders
              )
            : 0,

        lastPurchaseAt:
          lastPurchase,
      },
    });
  }

  console.log("");
  console.log(
    "=============================================="
  );

  console.log(
    "SEED COMPLETE"
  );

  console.log(
    "=============================================="
  );

  console.log(
    "Created orders:",
    createdOrders
  );

  console.log(
    "Skipped existing dates:",
    skippedExistingDays
  );

  console.log(
    "New zero-order days:",
    zeroOrderDays
  );

  console.log(
    "New revenue:",
    `₹${round(totalRevenue).toLocaleString("en-IN")}`
  );

  console.log(
    "=============================================="
  );
}

main()
  .catch((error) => {
    console.error(
      "Forecast seed failed:"
    );

    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });