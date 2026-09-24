import prisma from "../lib/prisma.js";

import {
  calculateForecastDataQuality,
} from "../utils/forecast.utils.js";

/* =========================================================
   HELPERS
========================================================= */

/**
 * Get authenticated user ID from auth middleware.
 */
function getUserId(req) {
  return req.user?.userId || req.user?.id;
}

/**
 * Build a continuous daily historical revenue series from
 * raw completed orders, so the forecast chart can render an
 * unbroken line from historical actuals into the predicted
 * horizon.
 */
function buildHistoricalRevenueSeries(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return [];
  }

  const dailyRevenue = new Map();

  for (const order of orders) {
    const date = new Date(order.orderDate);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const dateKey = date.toISOString().slice(0, 10);

    const existing = dailyRevenue.get(dateKey) || 0;

    dailyRevenue.set(
      dateKey,
      existing + Number(order.totalAmount || 0)
    );
  }

  const dates = [...dailyRevenue.keys()].sort();

  if (dates.length === 0) {
    return [];
  }

  const startDate = new Date(
    `${dates[0]}T00:00:00.000Z`
  );

  const endDate = new Date(
    `${dates[dates.length - 1]}T00:00:00.000Z`
  );

  const points = [];

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateKey = currentDate
      .toISOString()
      .slice(0, 10);

    points.push({
      period: `${dateKey}T00:00:00.000Z`,
      historicalRevenue: Number(
        (dailyRevenue.get(dateKey) || 0).toFixed(2)
      ),
      predictedRevenue: null,
      lowerBound: null,
      upperBound: null,
    });

    currentDate.setUTCDate(
      currentDate.getUTCDate() + 1
    );
  }

  return points;
}

/**
 * Safely convert Prisma Decimal/string/number
 * values into JavaScript numbers.
 */
function toNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

/**
 * Round numeric values to two decimal places.
 */
function roundMoney(value) {
  return Number(toNumber(value).toFixed(2));
}

/* =========================================================
   DASHBOARD SUMMARY

   GET /api/dashboard/summary
========================================================= */

export const getSummary = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    const [
      totalCustomers,
      totalProducts,
      orderAggregation,
      latestChurnPredictions,
    ] = await Promise.all([
      prisma.customer.count({
        where: {
          userId,
        },
      }),

      prisma.product.count({
        where: {
          userId,
        },
      }),

      prisma.order.aggregate({
        where: {
          userId,
          status: "completed",
        },

        _sum: {
          totalAmount: true,
        },

        _count: {
          id: true,
        },

        _avg: {
          totalAmount: true,
        },
      }),

      prisma.churnPrediction.findMany({
        where: {
          userId,
        },

        orderBy: {
          predictionDate: "desc",
        },

        select: {
          customerId: true,
          predictedChurn: true,
          riskLevel: true,
          churnProbability: true,
          predictionDate: true,
        },
      }),
    ]);

    const totalRevenue = toNumber(
      orderAggregation._sum.totalAmount
    );

    const totalOrders =
      orderAggregation._count.id || 0;

    const averageOrderValue = toNumber(
      orderAggregation._avg.totalAmount
    );

    const averageCustomerValue =
      totalCustomers > 0
        ? totalRevenue / totalCustomers
        : 0;

    /* =====================================================
       LATEST CHURN PREDICTION PER CUSTOMER
    ===================================================== */

    const latestByCustomer = new Map();

    for (const prediction of latestChurnPredictions) {
      if (!latestByCustomer.has(prediction.customerId)) {
        latestByCustomer.set(
          prediction.customerId,
          prediction
        );
      }
    }

    const latestPredictions = Array.from(
      latestByCustomer.values()
    );

    const churnedCustomers =
      latestPredictions.filter(
        (prediction) =>
          prediction.predictedChurn === true
      ).length;

    const highRiskCustomers =
      latestPredictions.filter(
        (prediction) =>
          String(
            prediction.riskLevel || ""
          ).toUpperCase() === "HIGH"
      ).length;

    const churnRate =
      latestPredictions.length > 0
        ? (churnedCustomers /
            latestPredictions.length) *
          100
        : 0;

    return res.status(200).json({
      success: true,

      data: {
        totalCustomers,
        totalProducts,
        totalOrders,

        totalRevenue: roundMoney(totalRevenue),

        averageOrderValue: roundMoney(
          averageOrderValue
        ),

        averageCustomerValue: roundMoney(
          averageCustomerValue
        ),

        churnRate: roundMoney(churnRate),

        highRiskCustomers,
      },
    });
  } catch (error) {
    console.error(
      "Dashboard summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard summary.",
    });
  }
};

/* =========================================================
   REVENUE ANALYTICS

   GET /api/dashboard/revenue
   GET /api/dashboard/revenue?year=2026
========================================================= */

export const getRevenue = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: "completed",
      },

      select: {
        id: true,
        orderDate: true,
        totalAmount: true,
      },

      orderBy: {
        orderDate: "asc",
      },
    });
    console.log(
  "Latest completed order:",
  orders.length
    ? orders[orders.length - 1].orderDate
    : null
);

console.log(
  "Latest 10 completed orders:",
  orders.slice(-10).map((order) => ({
    orderDate: order.orderDate,
    totalAmount: order.totalAmount,
  }))
);

    const availableYears = Array.from(
      new Set(
        orders
          .map((order) => {
            const date = new Date(order.orderDate);

            if (Number.isNaN(date.getTime())) {
              return null;
            }

            return date.getUTCFullYear();
          })
          .filter((year) => year !== null)
      )
    ).sort((a, b) => b - a);

    const requestedYear = Number(req.query.year);

    let selectedYear;

    if (
      Number.isInteger(requestedYear) &&
      requestedYear >= 2000 &&
      requestedYear <= 2100
    ) {
      selectedYear = requestedYear;
    } else if (availableYears.length > 0) {
      selectedYear = availableYears[0];
    } else {
      selectedYear =
        new Date().getUTCFullYear();
    }

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlyRevenue = monthNames.map(
      (month, index) => ({
        month,
        monthNumber: index + 1,

        period: `${selectedYear}-${String(
          index + 1
        ).padStart(2, "0")}`,

        revenue: 0,
        orders: 0,
      })
    );

    for (const order of orders) {
      const date = new Date(order.orderDate);

      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const orderYear = date.getUTCFullYear();

      if (orderYear !== selectedYear) {
        continue;
      }

      const monthIndex = date.getUTCMonth();

      monthlyRevenue[monthIndex].revenue +=
        toNumber(order.totalAmount);

      monthlyRevenue[monthIndex].orders += 1;
    }

    const data = monthlyRevenue.map((item) => ({
      month: item.month,
      monthNumber: item.monthNumber,
      period: item.period,
      revenue: roundMoney(item.revenue),
      orders: item.orders,
    }));

    const totalRevenue = data.reduce(
      (total, item) => total + item.revenue,
      0
    );

    const totalOrders = data.reduce(
      (total, item) => total + item.orders,
      0
    );

    const activeMonths = data.filter(
      (item) => item.orders > 0
    );

    const averageMonthlyRevenue =
      totalRevenue / 12;

    const averageActiveMonthRevenue =
      activeMonths.length > 0
        ? totalRevenue / activeMonths.length
        : 0;

    let bestMonth = null;

    if (activeMonths.length > 0) {
      const best = activeMonths.reduce(
        (highest, current) =>
          current.revenue > highest.revenue
            ? current
            : highest
      );

      bestMonth = {
        month: best.month,
        monthNumber: best.monthNumber,
        period: best.period,
        revenue: best.revenue,
        orders: best.orders,
      };
    }

    return res.status(200).json({
      success: true,

      year: selectedYear,

      availableYears,

      summary: {
        totalRevenue: roundMoney(totalRevenue),

        totalOrders,

        activeMonths: activeMonths.length,

        averageMonthlyRevenue: roundMoney(
          averageMonthlyRevenue
        ),

        averageActiveMonthRevenue: roundMoney(
          averageActiveMonthRevenue
        ),

        bestMonth,
      },

      data,
    });
  } catch (error) {
    console.error(
      "Revenue analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load revenue analytics.",
    });
  }
};

/* =========================================================
   PRODUCT PERFORMANCE

   GET /api/dashboard/products
========================================================= */

export const getProductPerformance = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    const orderItems =
      await prisma.orderItem.findMany({
        where: {
          order: {
            userId,
            status: "completed",
          },
        },

        select: {
          quantity: true,
          unitPrice: true,
          discount: true,

          product: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },

          order: {
            select: {
              id: true,
              orderDate: true,
            },
          },
        },
      });

    const productMap = new Map();

    for (const item of orderItems) {
      if (!item.product) {
        continue;
      }

      const productId = item.product.id;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          productId,

          name:
            item.product.name ||
            "Unknown Product",

          category:
            item.product.category ||
            "Uncategorized",

          quantitySold: 0,
          revenue: 0,

          orderIds: new Set(),
        });
      }

      const product = productMap.get(productId);

      const quantity = toNumber(item.quantity);

      const unitPrice = toNumber(item.unitPrice);

      const discount = toNumber(item.discount);

const itemRevenue = Math.max(
  0,
  quantity * unitPrice - discount
);

      product.quantitySold += quantity;

      product.revenue += itemRevenue;

      if (item.order?.id) {
        product.orderIds.add(item.order.id);
      }
    }

    const totalProductRevenue = Array.from(
      productMap.values()
    ).reduce(
      (total, product) =>
        total + product.revenue,
      0
    );

    const products = Array.from(
      productMap.values()
    )
      .map((product) => {
        const orderCount =
          product.orderIds.size;

        const averageSellingPrice =
          product.quantitySold > 0
            ? product.revenue /
              product.quantitySold
            : 0;

        const revenueShare =
          totalProductRevenue > 0
            ? (product.revenue /
                totalProductRevenue) *
              100
            : 0;

        return {
          productId: product.productId,

          name: product.name,

          category: product.category,

          quantitySold:
            product.quantitySold,

          orderCount,

          revenue: roundMoney(
            product.revenue
          ),

          averageSellingPrice: roundMoney(
            averageSellingPrice
          ),

          revenueShare: roundMoney(
            revenueShare
          ),
        };
      })
      .sort(
        (a, b) =>
          b.revenue - a.revenue
      );

    const topProduct =
      products.length > 0
        ? products[0]
        : null;

    return res.status(200).json({
      success: true,

      summary: {
        totalProducts: products.length,

        totalRevenue: roundMoney(
          totalProductRevenue
        ),

        topProduct,
      },

      data: products,
    });
  } catch (error) {
    console.error(
      "Product performance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load product performance.",
    });
  }
};

/* =========================================================
   CUSTOMER DISTRIBUTION

   GET /api/dashboard/customer-distribution
========================================================= */

export const getCustomerDistribution = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    const segments =
      await prisma.customerSegment.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          customerId: true,
          segmentName: true,
          createdAt: true,
        },
      });

    const latestByCustomer = new Map();

    for (const segment of segments) {
      if (
        !latestByCustomer.has(
          segment.customerId
        )
      ) {
        latestByCustomer.set(
          segment.customerId,
          segment.segmentName
        );
      }
    }

    const distribution = new Map();

    for (const segmentName of latestByCustomer.values()) {
      const safeName =
        segmentName || "Unclassified";

      distribution.set(
        safeName,
        (distribution.get(safeName) || 0) + 1
      );
    }

    const total = latestByCustomer.size;

    const data = Array.from(
      distribution.entries()
    )
      .map(([segment, count]) => ({
        segment,

        count,

        percentage:
          total > 0
            ? roundMoney(
                (count / total) * 100
              )
            : 0,
      }))
      .sort(
        (a, b) =>
          b.count - a.count
      );

    return res.status(200).json({
      success: true,

      total,

      data,
    });
  } catch (error) {
    console.error(
      "Customer distribution error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to load customer distribution.",
    });
  }
};

/* =========================================================
   RECENT ORDERS

   GET /api/dashboard/orders
   GET /api/dashboard/orders?limit=10
========================================================= */

export const getRecentOrders = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    const requestedLimit = Number(
      req.query.limit
    );

    const limit =
      Number.isInteger(requestedLimit) &&
      requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 10;

    const orders = await prisma.order.findMany({
      where: {
        userId,
      },

      orderBy: {
        orderDate: "desc",
      },

      take: limit,

      select: {
        id: true,
        externalId: true,
        orderDate: true,
        totalAmount: true,
        status: true,

        customer: {
          select: {
            id: true,
            externalId: true,
            name: true,
            email: true,
          },
        },

        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    const data = orders.map((order) => ({
      id: order.id,

      orderId:
        order.externalId || order.id,

      orderDate: order.orderDate,

      totalAmount: roundMoney(
        order.totalAmount
      ),

      status: order.status,

      itemCount:
        order._count.items,

      customer: order.customer
        ? {
            id: order.customer.id,

            customerId:
              order.customer.externalId ||
              order.customer.id,

            name:
              order.customer.name ||
              "Unknown Customer",

            email:
              order.customer.email ||
              null,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,

      count: data.length,

      data,
    });
  } catch (error) {
    console.error(
      "Recent orders error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to load recent orders.",
    });
  }
};

/* =========================================================
   CUSTOMER LIFETIME VALUE ANALYTICS

   GET /api/dashboard/clv

   Returns the latest CLV prediction for each customer.
   Historical prediction rows are preserved in PostgreSQL,
   but only the newest prediction per customer is used for
   dashboard analytics.
========================================================= */

export const getCLVAnalytics = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    /* =====================================================
       LOAD CLV PREDICTIONS

       Predictions are ordered newest first so that the
       first prediction encountered for each customer is
       the current/latest prediction.
    ===================================================== */

    const predictions =
      await prisma.cLVPrediction.findMany({
        where: {
          userId,
        },

        orderBy: {
          predictionDate: "desc",
        },

        select: {
          id: true,
          predictedValue: true,
          confidenceScore: true,
          modelVersion: true,
          predictionDate: true,
          customerId: true,

          customer: {
            select: {
              id: true,
              externalId: true,
              name: true,
              email: true,
              country: true,
              city: true,
              totalOrders: true,
              totalSpent: true,
              averageOrderValue: true,
              lastPurchaseAt: true,
            },
          },
        },
      });

    /* =====================================================
       LATEST PREDICTION PER CUSTOMER
    ===================================================== */

    const latestByCustomer = new Map();

    for (const prediction of predictions) {
      if (
        !latestByCustomer.has(
          prediction.customerId
        )
      ) {
        latestByCustomer.set(
          prediction.customerId,
          prediction
        );
      }
    }

    const latestPredictions =
      Array.from(
        latestByCustomer.values()
      );

    /* =====================================================
       NO PREDICTIONS YET

       This is not treated as an HTTP error. The frontend
       needs to be able to render its initial "Run CLV"
       state before the first model execution.
    ===================================================== */

    if (latestPredictions.length === 0) {
      return res.status(200).json({
        success: true,

        data: {
          customerCount: 0,

          totalPredictedValue: 0,

          averagePredictedValue: 0,

          medianPredictedValue: 0,

          averageConfidenceScore: 0,

          highValueCustomers: 0,

          aboveAverageCustomers: 0,

          modelVersion: null,

          predictionDate: null,

          highestValueCustomer: null,

          customers: [],
        },
      });
    }

    /* =====================================================
       NORMALIZE PREDICTIONS
    ===================================================== */

    const customers =
      latestPredictions.map(
        (prediction) => ({
          customerId:
            prediction.customerId,

          externalId:
            prediction.customer?.externalId ||
            prediction.customerId,

          name:
            prediction.customer?.name ||
            "Unknown Customer",

          email:
            prediction.customer?.email ||
            null,

          country:
            prediction.customer?.country ||
            null,

          city:
            prediction.customer?.city ||
            null,

          totalOrders:
            prediction.customer?.totalOrders ||
            0,

          totalSpent:
            roundMoney(
              prediction.customer?.totalSpent
            ),

          averageOrderValue:
            roundMoney(
              prediction.customer
                ?.averageOrderValue
            ),

          lastPurchaseAt:
            prediction.customer
              ?.lastPurchaseAt ||
            null,

          predictedValue:
            roundMoney(
              prediction.predictedValue
            ),

          confidenceScore:
            prediction.confidenceScore ===
              null ||
            prediction.confidenceScore ===
              undefined
              ? null
              : Number(
                  toNumber(
                    prediction.confidenceScore
                  ).toFixed(4)
                ),

          modelVersion:
            prediction.modelVersion ||
            null,

          predictionDate:
            prediction.predictionDate,
        })
      );

    /* =====================================================
       SORT CUSTOMERS BY CLV

       Highest predicted customer value appears first.
    ===================================================== */

    customers.sort(
      (a, b) =>
        b.predictedValue -
        a.predictedValue
    );

    /* =====================================================
       TOTAL + AVERAGE CLV
    ===================================================== */

    const totalPredictedValue =
      customers.reduce(
        (total, customer) =>
          total +
          customer.predictedValue,
        0
      );

    const averagePredictedValue =
      customers.length > 0
        ? totalPredictedValue /
          customers.length
        : 0;

    /* =====================================================
       MEDIAN CLV
    ===================================================== */

    const sortedValues =
      customers
        .map(
          (customer) =>
            customer.predictedValue
        )
        .sort(
          (a, b) => a - b
        );

    let medianPredictedValue = 0;

    if (sortedValues.length > 0) {
      const middle =
        Math.floor(
          sortedValues.length / 2
        );

      if (
        sortedValues.length % 2 === 0
      ) {
        medianPredictedValue =
          (
            sortedValues[middle - 1] +
            sortedValues[middle]
          ) / 2;
      } else {
        medianPredictedValue =
          sortedValues[middle];
      }
    }

    /* =====================================================
       AVERAGE CONFIDENCE SCORE
    ===================================================== */

    const confidenceScores =
      customers
        .map(
          (customer) =>
            customer.confidenceScore
        )
        .filter(
          (score) =>
            score !== null &&
            Number.isFinite(score)
        );

    const averageConfidenceScore =
      confidenceScores.length > 0
        ? confidenceScores.reduce(
            (total, score) =>
              total + score,
            0
          ) /
          confidenceScores.length
        : 0;

    /* =====================================================
       VALUE CLASSIFICATION

       Keep this consistent with the CLV execution
       controller:

       High Value >= 1.5 × average predicted CLV
    ===================================================== */

    const highValueThreshold =
      averagePredictedValue > 0
        ? averagePredictedValue * 1.5
        : 0;

    const highValueCustomers =
      customers.filter(
        (customer) =>
          highValueThreshold > 0 &&
          customer.predictedValue >=
            highValueThreshold
      ).length;

    const aboveAverageCustomers =
      customers.filter(
        (customer) =>
          customer.predictedValue >=
          averagePredictedValue
      ).length;

    /* =====================================================
       HIGHEST VALUE CUSTOMER

       customers[] is already sorted descending.
    ===================================================== */

    const highestValueCustomer =
      customers.length > 0
        ? customers[0]
        : null;

    /* =====================================================
       MODEL METADATA

       Since all predictions from the latest run currently
       share the same predictionDate/modelVersion, the newest
       persisted prediction provides the current metadata.

       Later, modelRunId will make this grouping explicit.
    ===================================================== */

    const latestPrediction =
      latestPredictions.reduce(
        (latest, prediction) =>
          new Date(
            prediction.predictionDate
          ).getTime() >
          new Date(
            latest.predictionDate
          ).getTime()
            ? prediction
            : latest
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,

      data: {
        customerCount:
          customers.length,

        totalPredictedValue:
          roundMoney(
            totalPredictedValue
          ),

        averagePredictedValue:
          roundMoney(
            averagePredictedValue
          ),

        medianPredictedValue:
          roundMoney(
            medianPredictedValue
          ),

        averageConfidenceScore:
          Number(
            averageConfidenceScore.toFixed(
              4
            )
          ),

        highValueCustomers,

        aboveAverageCustomers,

        modelVersion:
          latestPrediction.modelVersion ||
          null,

        predictionDate:
          latestPrediction.predictionDate,

        highestValueCustomer,

        customers,
      },
    });
  } catch (error) {
    console.error(
      "CLV analytics error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to load customer lifetime value analytics.",
    });
  }
};

/* =========================================================
   RECENT ACTIVITY

   GET /api/dashboard/activity
========================================================= */

export const getActivity = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    const [
      latestDatasets,
      latestSegment,
      latestChurn,
      latestForecast,
      latestOrders,
    ] = await Promise.all([
      prisma.dataset.findMany({
        where: {
          userId,
        },

        orderBy: {
          uploadedAt: "desc",
        },

        take: 3,

        select: {
          id: true,
          name: true,
          rowCount: true,
          uploadedAt: true,
        },
      }),

      prisma.customerSegment.findFirst({
        where: {
          userId,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          createdAt: true,
        },
      }),

      prisma.churnPrediction.findFirst({
        where: {
          userId,
        },

        orderBy: {
          predictionDate: "desc",
        },

        select: {
          predictionDate: true,
        },
      }),

      prisma.salesForecast.findFirst({
        where: {
          userId,
        },

        orderBy: {
          generatedAt: "desc",
        },

        select: {
          generatedAt: true,
        },
      }),

      prisma.order.findMany({
        where: {
          userId,
        },

        orderBy: {
          orderDate: "desc",
        },

        take: 3,

        select: {
          id: true,
          externalId: true,
          totalAmount: true,
          orderDate: true,
        },
      }),
    ]);

    const activity = [];

    /* =====================================================
       DATASET ACTIVITIES
    ===================================================== */

    for (const dataset of latestDatasets) {
      activity.push({
        id: `dataset-${dataset.id}`,

        type: "dataset",

        title: "Dataset imported",

        description:
          `${dataset.name} — ${
            dataset.rowCount || 0
          } rows`,

        timestamp: dataset.uploadedAt,
      });
    }

    /* =====================================================
       ORDER ACTIVITIES
    ===================================================== */

    for (const order of latestOrders) {
      activity.push({
        id: `order-${order.id}`,

        type: "order",

        title: "Order processed",

        description:
          `${
            order.externalId || order.id
          } — ${roundMoney(
            order.totalAmount
          )}`,

        timestamp: order.orderDate,
      });
    }

    /* =====================================================
       SEGMENTATION ACTIVITY
    ===================================================== */

    if (latestSegment) {
      activity.push({
        id: "segmentation-latest",

        type: "segmentation",

        title:
          "Customer segmentation completed",

        description:
          "Customer segmentation model results were generated.",

        timestamp:
          latestSegment.createdAt,
      });
    }

    /* =====================================================
       CHURN ACTIVITY
    ===================================================== */

    if (latestChurn) {
      activity.push({
        id: "churn-latest",

        type: "churn",

        title:
          "Churn prediction completed",

        description:
          "Customer churn probabilities were updated.",

        timestamp:
          latestChurn.predictionDate,
      });
    }

    /* =====================================================
       FORECAST ACTIVITY
    ===================================================== */

    if (latestForecast) {
      activity.push({
        id: "forecast-latest",

        type: "forecast",

        title:
          "Sales forecast generated",

        description:
          "Revenue forecasting results were updated.",

        timestamp:
          latestForecast.generatedAt,
      });
    }

    /* =====================================================
       SORT NEWEST → OLDEST
    ===================================================== */

    activity.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    );

    const data = activity.slice(0, 10);

    return res.status(200).json({
      success: true,

      count: data.length,

      data,
    });
  } catch (error) {
    console.error(
      "Dashboard activity error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to load dashboard activity.",
    });
  }
};

/* =========================================================
   CHURN ANALYTICS

   GET /api/dashboard/churn

   Returns:
   - Latest prediction per customer
   - Churn rate
   - Predicted churn count
   - Average churn probability
   - HIGH / MEDIUM / LOW risk distribution
   - Customer-level churn analytics
   - Latest model version and prediction date
========================================================= */

export const getChurnAnalytics = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    /* =====================================================
       LOAD PREDICTIONS
    ===================================================== */

    const predictions =
      await prisma.churnPrediction.findMany({
        where: {
          userId,
        },

        orderBy: {
          predictionDate: "desc",
        },

        select: {
          id: true,
          churnProbability: true,
          riskLevel: true,
          predictedChurn: true,
          modelVersion: true,
          predictionDate: true,
          customerId: true,

          customer: {
            select: {
              id: true,
              externalId: true,
              name: true,
              email: true,
              totalOrders: true,
              totalSpent: true,
              averageOrderValue: true,
              lastPurchaseAt: true,
            },
          },
        },
      });

    /* =====================================================
       EMPTY STATE
    ===================================================== */

    if (predictions.length === 0) {
      return res.status(200).json({
        success: true,
        hasPredictions: false,

        summary: {
          totalCustomers: 0,
          predictedChurnCount: 0,
          churnRate: 0,
          averageChurnProbability: 0,
          averageChurnPercentage: 0,
          highRiskCustomers: 0,
          mediumRiskCustomers: 0,
          lowRiskCustomers: 0,
          modelVersion: null,
          predictionDate: null,
        },

        riskDistribution: [
          {
            riskLevel: "HIGH",
            count: 0,
            percentage: 0,
          },

          {
            riskLevel: "MEDIUM",
            count: 0,
            percentage: 0,
          },

          {
            riskLevel: "LOW",
            count: 0,
            percentage: 0,
          },
        ],

        data: [],
      });
    }

    /* =====================================================
       LATEST PREDICTION PER CUSTOMER
    ===================================================== */

    const latestByCustomer = new Map();

    for (const prediction of predictions) {
      if (
        !latestByCustomer.has(
          prediction.customerId
        )
      ) {
        latestByCustomer.set(
          prediction.customerId,
          prediction
        );
      }
    }

    const latestPredictions = Array.from(
      latestByCustomer.values()
    );

    const totalCustomers =
      latestPredictions.length;

    /* =====================================================
       CHURN + RISK COUNTS
    ===================================================== */

    const predictedChurnCount =
      latestPredictions.filter(
        (prediction) =>
          prediction.predictedChurn === true
      ).length;

    const highRiskCustomers =
      latestPredictions.filter(
        (prediction) =>
          String(
            prediction.riskLevel || ""
          ).toUpperCase() === "HIGH"
      ).length;

    const mediumRiskCustomers =
      latestPredictions.filter(
        (prediction) =>
          String(
            prediction.riskLevel || ""
          ).toUpperCase() === "MEDIUM"
      ).length;

    const lowRiskCustomers =
      latestPredictions.filter(
        (prediction) =>
          String(
            prediction.riskLevel || ""
          ).toUpperCase() === "LOW"
      ).length;

    /* =====================================================
       KPI CALCULATIONS
    ===================================================== */

    const churnRate =
      totalCustomers > 0
        ? (predictedChurnCount /
            totalCustomers) *
          100
        : 0;

    const totalChurnProbability =
      latestPredictions.reduce(
        (total, prediction) =>
          total +
          toNumber(
            prediction.churnProbability
          ),
        0
      );

    const averageChurnProbability =
      totalCustomers > 0
        ? totalChurnProbability /
          totalCustomers
        : 0;

    const averageChurnPercentage =
      averageChurnProbability * 100;

    /*
     * Predictions are ordered newest first,
     * therefore index 0 is the latest prediction.
     */
    const latestPrediction =
      predictions[0] || null;

    /* =====================================================
       CUSTOMER-LEVEL ANALYTICS
    ===================================================== */

    const data = latestPredictions
      .map((prediction) => {
        const churnProbability =
          toNumber(
            prediction.churnProbability
          );

        return {
          id: prediction.id,

          customerId:
            prediction.customerId,

          externalId:
            prediction.customer
              ?.externalId || null,

          name:
            prediction.customer?.name ||
            "Unknown Customer",

          email:
            prediction.customer?.email ||
            null,

          churnProbability:
            Number(
              churnProbability.toFixed(4)
            ),

          churnPercentage:
            roundMoney(
              churnProbability * 100
            ),

          predictedChurn:
            prediction.predictedChurn,

          riskLevel:
            String(
              prediction.riskLevel ||
                "UNKNOWN"
            ).toUpperCase(),

          modelVersion:
            prediction.modelVersion ||
            null,

          predictionDate:
            prediction.predictionDate,

          customerMetrics: {
            totalOrders:
              prediction.customer
                ?.totalOrders || 0,

            totalSpent:
              roundMoney(
                prediction.customer
                  ?.totalSpent
              ),

            averageOrderValue:
              roundMoney(
                prediction.customer
                  ?.averageOrderValue
              ),

            lastPurchaseAt:
              prediction.customer
                ?.lastPurchaseAt || null,
          },
        };
      })
      .sort(
        (a, b) =>
          b.churnProbability -
          a.churnProbability
      );

    /* =====================================================
       RISK DISTRIBUTION
    ===================================================== */

    const riskDistribution = [
      {
        riskLevel: "HIGH",

        count:
          highRiskCustomers,

        percentage:
          totalCustomers > 0
            ? roundMoney(
                (highRiskCustomers /
                  totalCustomers) *
                  100
              )
            : 0,
      },

      {
        riskLevel: "MEDIUM",

        count:
          mediumRiskCustomers,

        percentage:
          totalCustomers > 0
            ? roundMoney(
                (mediumRiskCustomers /
                  totalCustomers) *
                  100
              )
            : 0,
      },

      {
        riskLevel: "LOW",

        count:
          lowRiskCustomers,

        percentage:
          totalCustomers > 0
            ? roundMoney(
                (lowRiskCustomers /
                  totalCustomers) *
                  100
              )
            : 0,
      },
    ];

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,

      hasPredictions:
        totalCustomers > 0,

      summary: {
        totalCustomers,

        predictedChurnCount,

        churnRate:
          roundMoney(churnRate),

        averageChurnProbability:
          Number(
            averageChurnProbability.toFixed(
              4
            )
          ),

        averageChurnPercentage:
          roundMoney(
            averageChurnPercentage
          ),

        highRiskCustomers,
        mediumRiskCustomers,
        lowRiskCustomers,

        modelVersion:
          latestPrediction
            ?.modelVersion || null,

        predictionDate:
          latestPrediction
            ?.predictionDate || null,
      },

      riskDistribution,

      data,
    });
  } catch (error) {
    console.error(
      "Churn analytics error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to load churn analytics.",
    });
  }
};

/* =========================================================
   MARKET BASKET ANALYTICS

   GET /api/dashboard/market-basket

   Returns the latest Market Basket Analysis generated by
   the Apriori model.
========================================================= */


/* =========================================================
   MARKET BASKET ANALYTICS
========================================================= */

export const getMarketBasketAnalytics = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

if (!userId) {
  return res.status(401).json({
    success: false,
    message: "Authentication required.",
  });
}

    const analysis = await prisma.marketBasketAnalysis.findFirst({
      where: {
        userId,
      },
      include: {
        rules: {
          orderBy: {
            lift: "desc",
          },
        },
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "No Market Basket Analysis found. Please run the analysis first.",
      });
    }

    /*
     * =====================================================
     * RESOLVE PRODUCT IDs TO PRODUCT DETAILS
     * =====================================================
     *
     * Frequent itemsets and rule antecedents/consequents are
     * persisted as raw product IDs (see runMarketBasketAnalysis
     * in analytics.controller.js). Resolve them to name/
     * category/price here before sending the response, or the
     * dashboard tables render with blank product names.
     */

    const frequentItemsets = Array.isArray(analysis.frequentItemsets)
      ? analysis.frequentItemsets
      : [];

    const itemsetProductIds = frequentItemsets.flatMap((itemset) =>
      Array.isArray(itemset?.items) ? itemset.items : []
    );

    const ruleProductIds = analysis.rules.flatMap((rule) => [
      ...(Array.isArray(rule.antecedent) ? rule.antecedent : []),
      ...(Array.isArray(rule.consequent) ? rule.consequent : []),
    ]);

    const strongestRuleProductIds = analysis.strongestRule
      ? [
          ...(Array.isArray(analysis.strongestRule.antecedents)
            ? analysis.strongestRule.antecedents
            : []),
          ...(Array.isArray(analysis.strongestRule.consequents)
            ? analysis.strongestRule.consequents
            : []),
        ]
      : [];

    const allProductIds = [
      ...new Set([
        ...itemsetProductIds,
        ...ruleProductIds,
        ...strongestRuleProductIds,
      ]),
    ];

    const products =
      allProductIds.length > 0
        ? await prisma.product.findMany({
            where: {
              userId,
              id: {
                in: allProductIds,
              },
            },
            select: {
              id: true,
              name: true,
              category: true,
              price: true,
            },
          })
        : [];

    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    const resolveProducts = (ids) =>
      (Array.isArray(ids) ? ids : []).map((id) => {
        const product = productMap.get(id);

        return {
          id,
          name: product?.name ?? "Unknown Product",
          category: product?.category ?? null,
          price: product?.price ?? null,
        };
      });

    const resolvedFrequentItemsets = frequentItemsets.map((itemset) => ({
      ...itemset,
      items: resolveProducts(itemset.items),
    }));

    const resolvedRules = analysis.rules.map((rule) => ({
      antecedents: resolveProducts(rule.antecedent),
      consequents: resolveProducts(rule.consequent),
      support: rule.support,
      confidence: rule.confidence,
      lift: rule.lift,
    }));

    const resolvedStrongestRule = analysis.strongestRule
      ? {
          ...analysis.strongestRule,
          antecedents: resolveProducts(
            analysis.strongestRule.antecedents
          ),
          consequents: resolveProducts(
            analysis.strongestRule.consequents
          ),
        }
      : null;

    return res.status(200).json({
      success: true,
      data: {
        algorithm: analysis.algorithm,
        modelVersion: analysis.modelVersion,

        transactionCount: analysis.transactionCount,
        uniqueProductCount: analysis.uniqueProductCount,

        frequentItemsetCount: analysis.frequentItemsetCount,
        associationRuleCount: analysis.associationRuleCount,

        averageConfidence: analysis.averageConfidence,
        maximumLift: analysis.maximumLift,

        strongestRule: resolvedStrongestRule,

        frequentItemsets: resolvedFrequentItemsets,

        rules: resolvedRules,

        analysisDate: analysis.generatedAt,
      },
    });
  } catch (error) {
    console.error("Market Basket Dashboard controller error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch Market Basket Analytics.",
    });
  }
};

  export const getRecommendationAnalytics = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    const recommendations =
      await prisma.productRecommendation.findMany({
        where: {
          userId,
        },

        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          product: {
            select: {
              id: true,
              name: true,
              category: true,
              price: true,
            },
          },
        },

        orderBy: {
          score: "desc",
        },
      });

    return res.status(200).json({
      success: true,

      data: {
        algorithm:
          recommendations.length > 0
            ? recommendations[0].algorithm
            : null,

        recommendationCount:
          recommendations.length,

        averageScore:
          recommendations.length > 0
            ? Number(
                (
                  recommendations.reduce(
                    (sum, r) => sum + r.score,
                    0
                  ) / recommendations.length
                ).toFixed(4)
              )
            : 0,

        highestScore:
          recommendations.length > 0
            ? recommendations[0].score
            : 0,

        recommendations,
      },
    });
  } catch (error) {
    console.error(
      "Recommendation dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load recommendations.",
    });
  }
};

/* =========================================================
   SALES FORECAST

   GET /api/dashboard/forecasting
========================================================= */

export const getForecastAnalytics = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    /*
     * -------------------------------------------------------
     * LOAD LATEST FORECAST
     * -------------------------------------------------------
     */

    const forecasts = await prisma.salesForecast.findMany({
      where: {
        userId,
      },

      orderBy: {
        forecastDate: "asc",
      },
    });

    if (forecasts.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No sales forecast found. Please run the forecasting model first.",
      });
    }

    /*
     * -------------------------------------------------------
     * LOAD COMPLETED ORDERS FOR DATA QUALITY
     * -------------------------------------------------------
     *
     * Use the raw completed orders rather than the forecast
     * records because data quality measures actual historical
     * coverage.
     */

    const completedOrders = await prisma.order.findMany({
      where: {
        userId,
        status: "completed",
      },

      select: {
        orderDate: true,
        totalAmount: true,
      },

      orderBy: {
        orderDate: "asc",
      },
    });

    const dataQuality =
      calculateForecastDataQuality(completedOrders);

    /*
     * -------------------------------------------------------
     * LATEST FORECAST METADATA
     * -------------------------------------------------------
     */

    const latest = forecasts[forecasts.length - 1];

    /*
     * -------------------------------------------------------
     * COMBINED HISTORICAL + FORECAST POINTS
     * -------------------------------------------------------
     */

    const historicalPoints =
      buildHistoricalRevenueSeries(completedOrders);

    const forecastPoints = forecasts.map(
  (forecast) => ({
    period:
      forecast.forecastDate.toISOString(),

    historicalRevenue: null,

    predictedRevenue:
      forecast.predictedRevenue,
    
    expectedOrders:
    forecast.expectedOrders,

    predictedOrders:
      forecast.predictedOrders,

    predictedAOV:
      forecast.predictedAOV,

    lowerBound:
      forecast.lowerBound,

    upperBound:
      forecast.upperBound,
  })
);

    const points = [
      ...historicalPoints,
      ...forecastPoints,
    ];

    /*
     * -------------------------------------------------------
     * DASHBOARD RESPONSE
     * -------------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      data: {
        algorithm: latest.algorithm,
        modelVersion: latest.modelVersion,

        horizon: forecasts.length,

        mae: latest.mae,
        rmse: latest.rmse,
        mape: latest.mape,
        wape: latest.wape,
        smape: latest.smape,
        evaluationDays: latest.evaluationDays,

        evaluation: {
          status:
            latest.evaluationDays == null
              ? "unknown"
              : latest.evaluationDays < 7
                ? "insufficient"
                : latest.evaluationDays < 14
                  ? "limited"
                  : "reliable",

          confidence:
            latest.evaluationDays == null
              ? "unknown"
              : latest.evaluationDays < 14
                ? "low"
                : latest.evaluationDays < 30
                  ? "medium"
                  : "high",

          evaluationDays: latest.evaluationDays,
          minimumRecommendedDays: 7,

          message:
            latest.evaluationDays != null &&
            latest.evaluationDays < 7
              ? "Accuracy metrics are based on too few observed sales days to be considered reliable."
              : latest.evaluationDays != null &&
                  latest.evaluationDays < 14
                ? "Accuracy metrics are based on a limited evaluation window and should be interpreted cautiously."
                : null,
        },

        dataQuality,

        generatedAt: latest.generatedAt,

        points,
      },
    });
  } catch (error) {
    console.error(
      "Forecast dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load sales forecast.",
    });
  }
};