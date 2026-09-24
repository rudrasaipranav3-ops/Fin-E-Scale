import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_ID = "cmsbi0qat0000l8kse16ou29u";

const productsData = [
  {
    externalId: "P1001",
    name: "Laptop",
    category: "Electronics",
    subCategory: "Computers",
    description: "High-performance business laptop",
    price: 65000,
    cost: 52000,
    stock: 25,
    brand: "DemoTech",
  },
  {
    externalId: "P1002",
    name: "Wireless Mouse",
    category: "Accessories",
    subCategory: "Computer Accessories",
    description: "Wireless optical mouse",
    price: 1200,
    cost: 700,
    stock: 100,
    brand: "DemoTech",
  },
  {
    externalId: "P1003",
    name: "Mechanical Keyboard",
    category: "Accessories",
    subCategory: "Computer Accessories",
    description: "Mechanical RGB keyboard",
    price: 3500,
    cost: 2200,
    stock: 75,
    brand: "DemoTech",
  },
  {
    externalId: "P1004",
    name: "Monitor",
    category: "Electronics",
    subCategory: "Displays",
    description: "24-inch Full HD monitor",
    price: 18000,
    cost: 13000,
    stock: 40,
    brand: "DemoTech",
  },
];

const customersData = [
  {
    externalId: "C1001",
    name: "Test Customer One",
    email: "customer1@example.com",
    phone: "9000000001",
    country: "India",
    city: "Hyderabad",
  },
  {
    externalId: "C1002",
    name: "Test Customer Two",
    email: "customer2@example.com",
    phone: "9000000002",
    country: "India",
    city: "Hyderabad",
  },
  {
    externalId: "C1003",
    name: "Test Customer Three",
    email: "customer3@example.com",
    phone: "9000000003",
    country: "India",
    city: "Hyderabad",
  },
];

try {
  console.log("\n==============================================");
  console.log("RESTORING MARKET BASKET DEMO DATA");
  console.log("==============================================\n");

  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
  });

  if (!user) {
    throw new Error(
      `User ${USER_ID} does not exist.`
    );
  }

  console.log(`Using user: ${user.email}`);
  console.log(`User ID: ${user.id}\n`);

  // ---------------------------------------------------------
  // PRODUCTS
  // ---------------------------------------------------------

  const products = {};

  for (const productData of productsData) {
    const product = await prisma.product.upsert({
      where: {
        userId_externalId: {
          userId: USER_ID,
          externalId: productData.externalId,
        },
      },
      update: {
        name: productData.name,
        category: productData.category,
        subCategory: productData.subCategory,
        description: productData.description,
        price: productData.price,
        cost: productData.cost,
        stock: productData.stock,
        brand: productData.brand,
      },
      create: {
        ...productData,
        userId: USER_ID,
      },
    });

    products[productData.externalId] = product;

    console.log(
      `Product: ${product.name} -> ${product.id}`
    );
  }

  // ---------------------------------------------------------
  // CUSTOMERS
  // ---------------------------------------------------------

  const customers = {};

  for (const customerData of customersData) {
    const customer = await prisma.customer.upsert({
      where: {
        userId_externalId: {
          userId: USER_ID,
          externalId: customerData.externalId,
        },
      },
      update: {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        country: customerData.country,
        city: customerData.city,
      },
      create: {
        ...customerData,
        userId: USER_ID,
      },
    });

    customers[customerData.externalId] = customer;

    console.log(
      `Customer: ${customer.name} -> ${customer.id}`
    );
  }

  // ---------------------------------------------------------
  // DELETE EXISTING DEMO ORDERS
  // ---------------------------------------------------------

  const demoOrderIds = [
    "O1001",
    "O1002",
    "O1003",
    "O1004",
    "O1005",
    "O1006",
    "O1007",
    "O1008",
    "O1009",
    "O1010",
  ];

  await prisma.order.deleteMany({
    where: {
      userId: USER_ID,
      externalId: {
        in: demoOrderIds,
      },
    },
  });

  // ---------------------------------------------------------
  // PRODUCT REFERENCES
  // ---------------------------------------------------------

  const laptop = products.P1001;
  const mouse = products.P1002;
  const keyboard = products.P1003;
  const monitor = products.P1004;

  const customer1 = customers.C1001;
  const customer2 = customers.C1002;
  const customer3 = customers.C1003;

  // ---------------------------------------------------------
  // ORDERS
  // ---------------------------------------------------------

  const orders = [
    {
      externalId: "O1001",
      customerId: customer1.id,
      orderDate: new Date("2026-07-01T00:00:00.000Z"),
      items: [
        {
          productId: laptop.id,
          quantity: 1,
          unitPrice: 65000,
          discount: 0,
          totalPrice: 65000,
        },
      ],
    },
    {
      externalId: "O1002",
      customerId: customer1.id,
      orderDate: new Date("2026-07-10T00:00:00.000Z"),
      items: [
        {
          productId: mouse.id,
          quantity: 2,
          unitPrice: 1200,
          discount: 0,
          totalPrice: 2400,
        },
      ],
    },
    {
      externalId: "O1003",
      customerId: customer2.id,
      orderDate: new Date("2026-07-11T00:00:00.000Z"),
      items: [
        {
          productId: keyboard.id,
          quantity: 1,
          unitPrice: 3500,
          discount: 0,
          totalPrice: 3500,
        },
      ],
    },
    {
      externalId: "O1004",
      customerId: customer3.id,
      orderDate: new Date("2026-07-15T00:00:00.000Z"),
      items: [
        {
          productId: monitor.id,
          quantity: 1,
          unitPrice: 18000,
          discount: 0,
          totalPrice: 18000,
        },
      ],
    },
    {
      externalId: "O1005",
      customerId: customer2.id,
      orderDate: new Date("2026-07-20T00:00:00.000Z"),
      items: [
        {
          productId: mouse.id,
          quantity: 1,
          unitPrice: 1200,
          discount: 0,
          totalPrice: 1200,
        },
      ],
    },
    {
      externalId: "O1006",
      customerId: customer1.id,
      orderDate: new Date("2026-08-08T19:01:03.246Z"),
      items: [
        {
          productId: laptop.id,
          quantity: 1,
          unitPrice: 65000,
          discount: 0,
          totalPrice: 65000,
        },
        {
          productId: mouse.id,
          quantity: 1,
          unitPrice: 1200,
          discount: 0,
          totalPrice: 1200,
        },
      ],
    },
    {
      externalId: "O1007",
      customerId: customer2.id,
      orderDate: new Date("2026-08-08T19:01:03.285Z"),
      items: [
        {
          productId: keyboard.id,
          quantity: 1,
          unitPrice: 3500,
          discount: 0,
          totalPrice: 3500,
        },
        {
          productId: laptop.id,
          quantity: 1,
          unitPrice: 65000,
          discount: 0,
          totalPrice: 65000,
        },
      ],
    },
    {
      externalId: "O1008",
      customerId: customer3.id,
      orderDate: new Date("2026-08-08T19:01:03.290Z"),
      items: [
        {
          productId: keyboard.id,
          quantity: 1,
          unitPrice: 3500,
          discount: 0,
          totalPrice: 3500,
        },
        {
          productId: mouse.id,
          quantity: 1,
          unitPrice: 1200,
          discount: 0,
          totalPrice: 1200,
        },
      ],
    },
    {
      externalId: "O1009",
      customerId: customer1.id,
      orderDate: new Date("2026-08-08T19:01:03.297Z"),
      items: [
        {
          productId: mouse.id,
          quantity: 1,
          unitPrice: 1200,
          discount: 0,
          totalPrice: 1200,
        },
        {
          productId: monitor.id,
          quantity: 1,
          unitPrice: 18000,
          discount: 0,
          totalPrice: 18000,
        },
      ],
    },
    {
      externalId: "O1010",
      customerId: customer2.id,
      orderDate: new Date("2026-08-08T19:01:03.306Z"),
      items: [
        {
          productId: keyboard.id,
          quantity: 1,
          unitPrice: 3500,
          discount: 0,
          totalPrice: 3500,
        },
        {
          productId: mouse.id,
          quantity: 1,
          unitPrice: 1200,
          discount: 0,
          totalPrice: 1200,
        },
        {
          productId: laptop.id,
          quantity: 1,
          unitPrice: 65000,
          discount: 0,
          totalPrice: 65000,
        },
      ],
    },
  ];

  // ---------------------------------------------------------
  // CREATE ORDERS
  // ---------------------------------------------------------

  for (const orderData of orders) {
    const totalAmount = orderData.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const order = await prisma.order.create({
      data: {
        externalId: orderData.externalId,
        orderDate: orderData.orderDate,
        status: "completed",
        totalAmount,
        discount: 0,
        shippingCost: 0,
        paymentMethod: "CARD",
        channel: "WEB",

        user: {
          connect: {
            id: USER_ID,
          },
        },

        customer: {
          connect: {
            id: orderData.customerId,
          },
        },

        items: {
          create: orderData.items,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log(
      `${order.externalId} -> ${order.items
        .map((item) => item.product.name)
        .join(" + ")}`
    );
  }

  // ---------------------------------------------------------
  // CUSTOMER STATISTICS
  // ---------------------------------------------------------

  for (const customer of Object.values(customers)) {
    const customerOrders =
      await prisma.order.findMany({
        where: {
          customerId: customer.id,
          userId: USER_ID,
          status: "completed",
        },
        select: {
          totalAmount: true,
          orderDate: true,
        },
      });

    const totalOrders = customerOrders.length;

    const totalSpent = customerOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    const averageOrderValue =
      totalOrders > 0
        ? totalSpent / totalOrders
        : 0;

    const lastPurchaseAt =
      customerOrders.length > 0
        ? customerOrders.reduce(
            (latest, order) =>
              order.orderDate > latest
                ? order.orderDate
                : latest,
            customerOrders[0].orderDate
          )
        : null;

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        totalOrders,
        totalSpent,
        averageOrderValue,
        lastPurchaseAt,
      },
    });
  }

  // ---------------------------------------------------------
  // VERIFICATION
  // ---------------------------------------------------------

  const productCount =
    await prisma.product.count({
      where: {
        userId: USER_ID,
      },
    });

  const customerCount =
    await prisma.customer.count({
      where: {
        userId: USER_ID,
      },
    });

  const orderCount =
    await prisma.order.count({
      where: {
        userId: USER_ID,
      },
    });

  const completedOrderCount =
    await prisma.order.count({
      where: {
        userId: USER_ID,
        status: "completed",
      },
    });

  console.log("\n==============================================");
  console.log("MARKET BASKET DEMO DATA RESTORED");
  console.log("==============================================");
  console.log(`Products:         ${productCount}`);
  console.log(`Customers:        ${customerCount}`);
  console.log(`Orders:           ${orderCount}`);
  console.log(`Completed orders: ${completedOrderCount}`);
  console.log("==============================================\n");

} catch (error) {
  console.error(
    "\nFailed to restore Market Basket demo data:"
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
