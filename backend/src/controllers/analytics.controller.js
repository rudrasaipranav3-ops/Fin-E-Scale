import prisma from "../lib/prisma.js";

import {
  calculateForecastDataQuality,
} from "../utils/forecast.utils.js";

import {
  generateForecastInsights,
} from "../services/forecastInsights.service.js"; 

import {
  generateForecastExplainability,
} from "../services/forecastExplainability.service.js";

import {
  generateForecastNotifications,
} from "../services/notification.service.js";

/* =========================================================
   CONFIGURATION
========================================================= */

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

const COMPLETED_ORDER_STATUS = "completed";

/* =========================================================
   GENERAL HELPERS
========================================================= */

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function round(value, decimals = 2) {
  const multiplier = 10 ** decimals;

  return (
    Math.round(
      (toFiniteNumber(value) + Number.EPSILON) *
        multiplier
    ) / multiplier
  );
}

function differenceInDays(laterDate, earlierDate) {
  const later = new Date(laterDate);
  const earlier = new Date(earlierDate);

  if (
    Number.isNaN(later.getTime()) ||
    Number.isNaN(earlier.getTime())
  ) {
    return 0;
  }

  const milliseconds =
    later.getTime() - earlier.getTime();

  return Math.max(
    0,
    milliseconds / (1000 * 60 * 60 * 24)
  );
}

function calculateAverageDaysBetweenOrders(orders) {
  if (!Array.isArray(orders) || orders.length < 2) {
    return 0;
  }

  const sortedDates = orders
    .map((order) => new Date(order.orderDate))
    .filter(
      (date) => !Number.isNaN(date.getTime())
    )
    .sort(
      (first, second) =>
        first.getTime() - second.getTime()
    );

  if (sortedDates.length < 2) {
    return 0;
  }

  let totalGapDays = 0;

  for (
    let index = 1;
    index < sortedDates.length;
    index += 1
  ) {
    totalGapDays += differenceInDays(
      sortedDates[index],
      sortedDates[index - 1]
    );
  }

  return round(
    totalGapDays / (sortedDates.length - 1),
    2
  );
}

function getReferenceDate(customers) {
  const orderDates = customers.flatMap(
    (customer) =>
      customer.orders
        .map((order) => new Date(order.orderDate))
        .filter(
          (date) => !Number.isNaN(date.getTime())
        )
  );

  if (orderDates.length === 0) {
    return new Date();
  }

  const latestOrderTimestamp = Math.max(
    ...orderDates.map((date) => date.getTime())
  );

  /*
   * Use the later of:
   *
   * 1. Current time
   * 2. Latest order date
   *
   * This prevents negative recency values if imported
   * datasets contain future-dated transactions.
   */
  return new Date(
    Math.max(
      Date.now(),
      latestOrderTimestamp
    )
  );
}

async function callMlService(endpoint, payload) {
  const response = await fetch(
    `${ML_SERVICE_URL}${endpoint}`,
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    }
  );

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `ML service returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
  const detail =
    typeof result?.detail === "string"
      ? result.detail
      : result?.detail
        ? JSON.stringify(result.detail, null, 2)
        : `ML service request failed (${response.status}).`;

  throw new Error(detail);
}

  return result;
}

/*
 * -------------------------------------------------------
 * RESOLVE ACTIVE DATASET
 * -------------------------------------------------------
 *
 * ML results (segmentation, churn, CLV, market basket,
 * recommendations, forecasts) are generated from whatever
 * data currently exists for the user, which may span
 * several CSV uploads.
 *
 * We tag every persisted ML result with the most recently
 * completed dataset so results can be traced back to the
 * data version that produced them.
 */

async function getLatestDatasetId(userId) {
  const dataset = await prisma.dataset.findFirst({
    where: {
      userId,
      status: "completed",
    },

    orderBy: {
      uploadedAt: "desc",
    },

    select: {
      id: true,
    },
  });

  return dataset?.id ?? null;
}

/* =========================================================
   SEGMENTATION HELPERS
========================================================= */

function buildSegmentationFeatures(
  customers,
  referenceDate
) {
  return customers.map((customer) => {
    const orders = customer.orders;

    const frequency = orders.length;

    const monetary = orders.reduce(
      (total, order) =>
        total + toFiniteNumber(order.totalAmount),
      0
    );

    const averageOrderValue =
      frequency > 0
        ? monetary / frequency
        : 0;

    const lastOrder =
      frequency > 0
        ? orders[orders.length - 1]
        : null;

    const recency =
      lastOrder !== null
        ? differenceInDays(
            referenceDate,
            lastOrder.orderDate
          )
        : 0;

    return {
      customerId: customer.id,

      recency: round(recency, 2),

      frequency,

      monetary: round(monetary, 2),

      averageOrderValue: round(
        averageOrderValue,
        2
      ),
    };
  });
}

/* =========================================================
   RUN CUSTOMER SEGMENTATION
========================================================= */

export async function runCustomerSegmentation(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const customers =
      await prisma.customer.findMany({
        where: {
          userId,
        },

        select: {
          id: true,
          externalId: true,
          name: true,

          orders: {
            where: {
              status:
                COMPLETED_ORDER_STATUS,
            },

            select: {
              id: true,
              orderDate: true,
              totalAmount: true,
            },

            orderBy: {
              orderDate: "asc",
            },
          },
        },
      });

    if (customers.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "At least two customers are required to run customer segmentation.",
      });
    }

    const customersWithOrders =
      customers.filter(
        (customer) =>
          customer.orders.length > 0
      );

    if (customersWithOrders.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "At least two customers with completed orders are required for segmentation.",
      });
    }

    const referenceDate =
      getReferenceDate(
        customersWithOrders
      );

    const features =
      buildSegmentationFeatures(
        customersWithOrders,
        referenceDate
      );

    /*
     * Do not request more clusters than customers.
     *
     * Three clusters are sufficient for the current
     * High Value / Regular / At Risk development model.
     */
    const clusterCount = Math.min(
      3,
      features.length
    );

    const mlResult =
      await callMlService(
        "/api/ml/segmentation/run",
        {
          customers: features,
          nClusters: clusterCount,
        }
      );

    const datasetId =
      await getLatestDatasetId(userId);

    const assignments =
      Array.isArray(
        mlResult?.customers
      )
        ? mlResult.customers
        : Array.isArray(
              mlResult?.assignments
            )
          ? mlResult.assignments
          : [];

    if (assignments.length === 0) {
      throw new Error(
        "ML service returned no segmentation assignments."
      );
    }

    const validCustomerIds = new Set(
      customersWithOrders.map(
        (customer) => customer.id
      )
    );

    const records = assignments
      .filter(
        (assignment) =>
          validCustomerIds.has(
            assignment.customerId
          )
      )
      .map((assignment) => ({
        customerId:
          assignment.customerId,

        userId,

        datasetId,

        segmentName:
          assignment.segmentName ??
          assignment.segment ??
          "Regular",

        clusterNumber:
          Number.isInteger(
            assignment.clusterNumber
          )
            ? assignment.clusterNumber
            : Number(
                assignment.cluster ??
                  assignment.clusterNumber ??
                  0
              ),

        description:
          assignment.description ??
          null,

        score:
          assignment.score == null
            ? null
            : toFiniteNumber(
                assignment.score
              ),
      }));

    if (records.length === 0) {
      throw new Error(
        "No valid segmentation results were returned by the ML service."
      );
    }

    await prisma.customerSegment.createMany({
      data: records,
    });

    return res.status(200).json({
      success: true,

      message:
        "Customer segmentation completed successfully.",

      data: {
        algorithm:
          mlResult?.algorithm ??
          "K-Means",

        customerCount:
          records.length,

        clusterCount,

        features: [
          "Recency",
          "Frequency",
          "Monetary",
          "AOV",
        ],
      },
    });
  } catch (error) {
    console.error(
      "Customer segmentation controller error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to run customer segmentation.",
    });
  }
}

/* =========================================================
   CHURN FEATURE ENGINEERING
========================================================= */

function buildChurnFeatures(
  customers,
  referenceDate
) {
  return customers.map((customer) => {
    const orders = customer.orders;

    const frequency = orders.length;

    const monetaryValue =
      orders.reduce(
        (total, order) =>
          total +
          toFiniteNumber(
            order.totalAmount
          ),
        0
      );

    const averageOrderValue =
      frequency > 0
        ? monetaryValue / frequency
        : 0;

    const firstOrder =
      frequency > 0
        ? orders[0]
        : null;

    const lastOrder =
      frequency > 0
        ? orders[orders.length - 1]
        : null;

    const recencyDays =
      lastOrder !== null
        ? differenceInDays(
            referenceDate,
            lastOrder.orderDate
          )
        : 0;

    /*
     * For churn behaviour, purchase-history tenure is
     * preferable to Customer.createdAt because imported
     * customers may all have the same database creation
     * timestamp.
     */
    const customerTenureDays =
      firstOrder !== null
        ? differenceInDays(
            referenceDate,
            firstOrder.orderDate
          )
        : 0;

    const averageDaysBetweenOrders =
      calculateAverageDaysBetweenOrders(
        orders
      );

    return {
      customerId: customer.id,

      recencyDays: round(
        recencyDays,
        2
      ),

      frequency,

      monetaryValue: round(
        monetaryValue,
        2
      ),

      averageOrderValue: round(
        averageOrderValue,
        2
      ),

      customerTenureDays: round(
        customerTenureDays,
        2
      ),

      averageDaysBetweenOrders:
        round(
          averageDaysBetweenOrders,
          2
        ),
    };
  });
}

/* =========================================================
   VALIDATE CHURN RESULT
========================================================= */

function validateChurnPrediction(
  prediction,
  validCustomerIds
) {
  if (
    !prediction ||
    typeof prediction !== "object"
  ) {
    return false;
  }

  if (
    typeof prediction.customerId !==
      "string" ||
    !validCustomerIds.has(
      prediction.customerId
    )
  ) {
    return false;
  }

  const probability = Number(
    prediction.churnProbability
  );

  if (
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability > 1
  ) {
    return false;
  }

  if (
    typeof prediction.predictedChurn !==
    "boolean"
  ) {
    return false;
  }

  const riskLevel = String(
    prediction.riskLevel ?? ""
  ).toUpperCase();

  return [
    "LOW",
    "MEDIUM",
    "HIGH",
  ].includes(riskLevel);
}

/* =========================================================
   RUN CUSTOMER CHURN PREDICTION
========================================================= */

export async function runCustomerChurnPrediction(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    /*
     * -------------------------------------------------------
     * LOAD CUSTOMER TRANSACTION HISTORY
     * -------------------------------------------------------
     *
     * IMPORTANT:
     *
     * Customer uses `externalId`, not `customerId`.
     * The internal Prisma `id` is passed to FastAPI as
     * `customerId` so predictions can be persisted safely.
     */

    const customers =
      await prisma.customer.findMany({
        where: {
          userId,
        },

        select: {
          id: true,
          externalId: true,
          name: true,
          email: true,

          orders: {
            where: {
              status:
                COMPLETED_ORDER_STATUS,
            },

            select: {
              id: true,
              orderDate: true,
              totalAmount: true,
            },

            orderBy: {
              orderDate: "asc",
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      });

    if (customers.length === 0) {
      return res.status(400).json({
        success: false,

        message:
          "No customers are available for churn prediction.",
      });
    }

    const customersWithOrders =
      customers.filter(
        (customer) =>
          customer.orders.length > 0
      );

    if (
      customersWithOrders.length === 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "No customers with completed orders are available for churn prediction.",
      });
    }

    /*
     * -------------------------------------------------------
     * FEATURE ENGINEERING
     * -------------------------------------------------------
     */

    const referenceDate =
      getReferenceDate(
        customersWithOrders
      );

    const features =
      buildChurnFeatures(
        customersWithOrders,
        referenceDate
      );

    /*
     * -------------------------------------------------------
     * CALL FASTAPI
     * -------------------------------------------------------
     */

    const mlResult =
      await callMlService(
        "/api/ml/churn/predict",
        {
          customers: features,
        }
      );

    if (
      mlResult?.success !== true
    ) {
      throw new Error(
        "Churn ML service did not return a successful result."
      );
    }

    const predictions =
      Array.isArray(
        mlResult.customers
      )
        ? mlResult.customers
        : [];

    if (
      predictions.length === 0
    ) {
      throw new Error(
        "Churn ML service returned no predictions."
      );
    }

    /*
     * -------------------------------------------------------
     * VALIDATE FASTAPI RESPONSE
     * -------------------------------------------------------
     */

    const validCustomerIds =
      new Set(
        customersWithOrders.map(
          (customer) =>
            customer.id
        )
      );

    const invalidPrediction =
      predictions.find(
        (prediction) =>
          !validateChurnPrediction(
            prediction,
            validCustomerIds
          )
      );

    if (invalidPrediction) {
      throw new Error(
        "Churn ML service returned an invalid prediction."
      );
    }

    /*
     * Prevent duplicate predictions for the same customer
     * inside a single FastAPI response.
     */

    const predictionCustomerIds =
      predictions.map(
        (prediction) =>
          prediction.customerId
      );

    if (
      new Set(
        predictionCustomerIds
      ).size !==
      predictionCustomerIds.length
    ) {
      throw new Error(
        "Churn ML service returned duplicate customer predictions."
      );
    }

    /*
     * Ensure every submitted customer received a prediction.
     */

    if (
      predictions.length !==
      features.length
    ) {
      throw new Error(
        "Churn ML service did not return a prediction for every customer."
      );
    }

    /*
     * -------------------------------------------------------
     * PREPARE PRISMA RECORDS
     * -------------------------------------------------------
     */

    const modelVersion =
      typeof mlResult.modelVersion ===
        "string" &&
      mlResult.modelVersion.trim()
        ? mlResult.modelVersion.trim()
        : "behavioral-churn-v1";

    const predictionDate =
      new Date();

    const datasetId =
      await getLatestDatasetId(userId);

    const records =
      predictions.map(
        (prediction) => ({
          churnProbability:
            round(
              Number(
                prediction.churnProbability
              ),
              4
            ),

          riskLevel:
            String(
              prediction.riskLevel
            ).toUpperCase(),

          predictedChurn:
            prediction.predictedChurn,

          modelVersion,

          predictionDate,

          customerId:
            prediction.customerId,

          userId,

          datasetId,
        })
      );

    /*
     * -------------------------------------------------------
     * PERSIST RESULTS
     * -------------------------------------------------------
     *
     * We intentionally keep previous runs for now.
     * Dashboard queries should select the latest prediction
     * per customer using predictionDate.
     */

    await prisma.churnPrediction.createMany({
      data: records,
    });

    /*
     * -------------------------------------------------------
     * RESPONSE SUMMARY
     * -------------------------------------------------------
     */

    const predictedChurnCount =
      records.filter(
        (record) =>
          record.predictedChurn
      ).length;

    const highRiskCustomers =
      records.filter(
        (record) =>
          record.riskLevel ===
          "HIGH"
      ).length;

    const mediumRiskCustomers =
      records.filter(
        (record) =>
          record.riskLevel ===
          "MEDIUM"
      ).length;

    const lowRiskCustomers =
      records.filter(
        (record) =>
          record.riskLevel ===
          "LOW"
      ).length;

    const churnRate =
      records.length > 0
        ? round(
            (
              predictedChurnCount /
              records.length
            ) * 100,
            2
          )
        : 0;

    const averageChurnProbability =
      records.length > 0
        ? round(
            records.reduce(
              (total, record) =>
                total +
                record.churnProbability,
              0
            ) /
              records.length,
            4
          )
        : 0;

    return res.status(200).json({
      success: true,

      message:
        "Customer churn prediction completed successfully.",

      data: {
        modelVersion,

        modelType:
          "behavioral-churn-risk",

        customerCount:
          records.length,

        predictedChurnCount,

        churnRate,

        highRiskCustomers,

        mediumRiskCustomers,

        lowRiskCustomers,

        averageChurnProbability,

        features: [
          "Recency",
          "Frequency",
          "Monetary Value",
          "Average Order Value",
          "Customer Tenure",
          "Average Days Between Orders",
        ],

        predictionDate:
          predictionDate.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Customer churn prediction controller error:",
      error
    );

    /*
     * Keep the public response generic while the detailed
     * error remains available in the backend terminal.
     */

    return res.status(500).json({
      success: false,

      message:
        "Unable to run customer churn prediction.",
    });
  }
}

/* =========================================================
   CLV FEATURE ENGINEERING
========================================================= */

function buildCLVFeatures(
  customers,
  referenceDate
) {
  return customers.map((customer) => {
    const orders = customer.orders;

    const frequency = orders.length;

    const monetary =
      orders.reduce(
        (total, order) =>
          total +
          toFiniteNumber(
            order.totalAmount
          ),
        0
      );

    const averageOrderValue =
      frequency > 0
        ? monetary / frequency
        : 0;

    const firstOrder =
      frequency > 0
        ? orders[0]
        : null;

    const lastOrder =
      frequency > 0
        ? orders[orders.length - 1]
        : null;

    /*
     * Number of days since the customer's
     * most recent completed order.
     */
    const recencyDays =
      lastOrder !== null
        ? differenceInDays(
            referenceDate,
            lastOrder.orderDate
          )
        : 0;

    /*
     * Customer tenure is based on purchase
     * history rather than database creation time.
     *
     * This is important for imported datasets,
     * where every Customer row may have nearly
     * identical createdAt timestamps.
     */
    const tenureDays =
      firstOrder !== null
        ? differenceInDays(
            referenceDate,
            firstOrder.orderDate
          )
        : 0;

    const averageDaysBetweenOrders =
      calculateAverageDaysBetweenOrders(
        orders
      );

    return {
      /*
       * FastAPI calls this customerId, but this is
       * deliberately the internal Prisma Customer.id.
       *
       * That lets us safely persist the prediction
       * through the CLVPrediction relation.
       */
      customerId: customer.id,

      recencyDays: round(
        recencyDays,
        2
      ),

      frequency,

      monetary: round(
        monetary,
        2
      ),

      averageOrderValue: round(
        averageOrderValue,
        2
      ),

      tenureDays: round(
        tenureDays,
        2
      ),

      averageDaysBetweenOrders:
        round(
          averageDaysBetweenOrders,
          2
        ),
    };
  });
}

/* =========================================================
   VALIDATE CLV RESULT
========================================================= */

function validateCLVPrediction(
  prediction,
  validCustomerIds
) {
  if (
    !prediction ||
    typeof prediction !== "object"
  ) {
    return false;
  }

  if (
    typeof prediction.customerId !==
      "string" ||
    !validCustomerIds.has(
      prediction.customerId
    )
  ) {
    return false;
  }

  const predictedValue =
    Number(
      prediction.predictedValue
    );

  if (
    !Number.isFinite(
      predictedValue
    ) ||
    predictedValue < 0
  ) {
    return false;
  }

  /*
   * confidenceScore is optional in Prisma,
   * but if FastAPI sends it, it must be
   * a valid probability-like value.
   */
  if (
    prediction.confidenceScore !==
      null &&
    prediction.confidenceScore !==
      undefined
  ) {
    const confidenceScore =
      Number(
        prediction.confidenceScore
      );

    if (
      !Number.isFinite(
        confidenceScore
      ) ||
      confidenceScore < 0 ||
      confidenceScore > 1
    ) {
      return false;
    }
  }

  return true;
}

/* =========================================================
   RUN CUSTOMER LIFETIME VALUE PREDICTION
========================================================= */

export async function runCustomerCLVPrediction(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    /*
     * -------------------------------------------------------
     * LOAD CUSTOMER TRANSACTION HISTORY
     * -------------------------------------------------------
     */

    const customers =
      await prisma.customer.findMany({
        where: {
          userId,
        },

        select: {
          id: true,
          externalId: true,
          name: true,
          email: true,

          orders: {
            where: {
              status:
                COMPLETED_ORDER_STATUS,
            },

            select: {
              id: true,
              orderDate: true,
              totalAmount: true,
            },

            orderBy: {
              orderDate: "asc",
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      });

    /*
     * -------------------------------------------------------
     * VALIDATE CUSTOMER DATA
     * -------------------------------------------------------
     */

    if (
      customers.length === 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "No customers are available for CLV prediction.",
      });
    }

    const customersWithOrders =
      customers.filter(
        (customer) =>
          customer.orders.length > 0
      );

    if (
      customersWithOrders.length === 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "No customers with completed orders are available for CLV prediction.",
      });
    }

    /*
     * -------------------------------------------------------
     * FEATURE ENGINEERING
     * -------------------------------------------------------
     */

    const referenceDate =
      getReferenceDate(
        customersWithOrders
      );

    const features =
      buildCLVFeatures(
        customersWithOrders,
        referenceDate
      );

    if (
      features.length === 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Unable to generate customer features for CLV prediction.",
      });
    }

    /*
     * -------------------------------------------------------
     * CALL FASTAPI CLV SERVICE
     * -------------------------------------------------------
     */

    const mlResult =
      await callMlService(
        "/api/ml/clv/predict",
        {
          customers: features,
        }
      );

    if (
      mlResult?.success !== true
    ) {
      throw new Error(
        "CLV ML service did not return a successful result."
      );
    }

    const predictions =
      Array.isArray(
        mlResult.customers
      )
        ? mlResult.customers
        : [];

    if (
      predictions.length === 0
    ) {
      throw new Error(
        "CLV ML service returned no predictions."
      );
    }

    /*
     * -------------------------------------------------------
     * VALIDATE FASTAPI CUSTOMER IDS
     * -------------------------------------------------------
     */

    const validCustomerIds =
      new Set(
        customersWithOrders.map(
          (customer) =>
            customer.id
        )
      );

    const invalidPrediction =
      predictions.find(
        (prediction) =>
          !validateCLVPrediction(
            prediction,
            validCustomerIds
          )
      );

    if (invalidPrediction) {
      throw new Error(
        "CLV ML service returned an invalid prediction."
      );
    }

    /*
     * -------------------------------------------------------
     * PREVENT DUPLICATE CUSTOMER RESULTS
     * -------------------------------------------------------
     */

    const predictionCustomerIds =
      predictions.map(
        (prediction) =>
          prediction.customerId
      );

    if (
      new Set(
        predictionCustomerIds
      ).size !==
      predictionCustomerIds.length
    ) {
      throw new Error(
        "CLV ML service returned duplicate customer predictions."
      );
    }

    /*
     * -------------------------------------------------------
     * ENSURE COMPLETE RESULT SET
     * -------------------------------------------------------
     *
     * Every customer sent to FastAPI must receive
     * exactly one CLV prediction.
     */

    if (
      predictions.length !==
      features.length
    ) {
      throw new Error(
        "CLV ML service did not return a prediction for every customer."
      );
    }

    /*
     * -------------------------------------------------------
     * MODEL METADATA
     * -------------------------------------------------------
     */

    const modelVersion =
      typeof mlResult.modelVersion ===
        "string" &&
      mlResult.modelVersion.trim()
        ? mlResult.modelVersion.trim()
        : "behavioral-clv-v1";

    const predictionDate =
      new Date();

    const datasetId =
      await getLatestDatasetId(userId);

    /*
     * -------------------------------------------------------
     * PREPARE PRISMA RECORDS
     * -------------------------------------------------------
     *
     * Matches:
     *
     * model CLVPrediction {
     *   predictedValue   Float
     *   confidenceScore Float?
     *   modelVersion    String?
     *   predictionDate  DateTime
     *   customerId      String
     *   userId          String
     * }
     */

    const records =
      predictions.map(
        (prediction) => ({
          predictedValue:
            round(
              Number(
                prediction.predictedValue
              ),
              2
            ),

          confidenceScore:
            prediction.confidenceScore ===
                null ||
            prediction.confidenceScore ===
                undefined
              ? null
              : round(
                  Number(
                    prediction.confidenceScore
                  ),
                  4
                ),

          modelVersion,

          predictionDate,

          customerId:
            prediction.customerId,

          userId,

          datasetId,
        })
      );

    /*
     * -------------------------------------------------------
     * PERSIST CLV RESULTS
     * -------------------------------------------------------
     *
     * Like segmentation and churn, previous prediction
     * runs are intentionally preserved.
     *
     * Later we can introduce modelRunId / analysisRunId
     * so each ML execution is grouped explicitly.
     */

    await prisma.cLVPrediction.createMany({
      data: records,
    });

    /*
     * -------------------------------------------------------
     * CALCULATE SUMMARY METRICS
     * -------------------------------------------------------
     */

    const totalPredictedValue =
      round(
        records.reduce(
          (total, record) =>
            total +
            record.predictedValue,
          0
        ),
        2
      );

    const averagePredictedValue =
      records.length > 0
        ? round(
            totalPredictedValue /
              records.length,
            2
          )
        : 0;

    const confidenceRecords =
      records.filter(
        (record) =>
          record.confidenceScore !==
          null
      );

    const averageConfidenceScore =
      confidenceRecords.length > 0
        ? round(
            confidenceRecords.reduce(
              (total, record) =>
                total +
                record.confidenceScore,
              0
            ) /
              confidenceRecords.length,
            4
          )
        : null;

    /*
     * -------------------------------------------------------
     * HIGHEST VALUE CUSTOMER
     * -------------------------------------------------------
     */

    const highestValueRecord =
      records.length > 0
        ? records.reduce(
            (highest, record) =>
              record.predictedValue >
              highest.predictedValue
                ? record
                : highest
          )
        : null;

    const customerLookup =
      new Map(
        customersWithOrders.map(
          (customer) => [
            customer.id,
            customer,
          ]
        )
      );

    const highestValueCustomer =
      highestValueRecord
        ? customerLookup.get(
            highestValueRecord.customerId
          )
        : null;

    /*
     * -------------------------------------------------------
     * VALUE DISTRIBUTION
     * -------------------------------------------------------
     *
     * These groups are dashboard-friendly descriptive
     * categories. They do not change the actual CLV
     * prediction stored in Prisma.
     */

    const sortedValues =
      records
        .map(
          (record) =>
            record.predictedValue
        )
        .sort(
          (first, second) =>
            first - second
        );

    const medianPredictedValue =
      calculateMedian(
        sortedValues
      );

    const highValueThreshold =
      averagePredictedValue > 0
        ? averagePredictedValue * 1.5
        : 0;

    const highValueCustomers =
      records.filter(
        (record) =>
          record.predictedValue >=
          highValueThreshold &&
          highValueThreshold > 0
      ).length;

    const aboveAverageCustomers =
      records.filter(
        (record) =>
          record.predictedValue >=
          averagePredictedValue
      ).length;

    /*
     * -------------------------------------------------------
     * SUCCESS RESPONSE
     * -------------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      message:
        "Customer lifetime value prediction completed successfully.",

      data: {
        modelVersion,

        modelType:
          mlResult?.modelType ??
          "behavioral-clv",

        customerCount:
          records.length,

        totalPredictedValue,

        averagePredictedValue,

        medianPredictedValue,

        averageConfidenceScore,

        highValueCustomers,

        aboveAverageCustomers,

        highestValueCustomer:
          highestValueRecord
            ? {
                customerId:
                  highestValueRecord.customerId,

                externalId:
                  highestValueCustomer?.externalId ??
                  null,

                name:
                  highestValueCustomer?.name ??
                  null,

                predictedValue:
                  highestValueRecord.predictedValue,

                confidenceScore:
                  highestValueRecord.confidenceScore,
              }
            : null,

        features: [
          "Recency",
          "Frequency",
          "Monetary Value",
          "Average Order Value",
          "Customer Tenure",
          "Average Days Between Orders",
        ],

        predictionDate:
          predictionDate.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Customer lifetime value prediction controller error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to run customer lifetime value prediction.",
    });
  }
}

/* =========================================================
   CLV STATISTICAL HELPERS
========================================================= */

function calculateMedian(values) {
  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {
    return 0;
  }

  const sorted = [
    ...values,
  ].sort(
    (first, second) =>
      first - second
  );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length % 2 === 0
  ) {
    return round(
      (
        sorted[middle - 1] +
        sorted[middle]
      ) / 2,
      2
    );
  }

  return round(
    sorted[middle],
    2
  );
} 

/* =========================================================
   FORECASTING HELPERS
========================================================= */

/**
 * Aggregate completed orders into a daily revenue time
 * series. FastAPI expects one point per calendar day so it
 * can fit a forecasting model (e.g. trend/seasonality) on
 * top of it.
 */
function buildDailyRevenueHistory(
  orders,
  startDate,
  endDate
) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return [];
  }

  const dailyTotals = new Map();

  // -------------------------------------------------------
  // AGGREGATE ACTUAL ORDER DATA BY UTC CALENDAR DATE
  // -------------------------------------------------------

  for (const order of orders) {
    const orderDate = new Date(order.orderDate);

    if (Number.isNaN(orderDate.getTime())) {
      continue;
    }

    const dateKey = orderDate
      .toISOString()
      .slice(0, 10);

    const existing =
      dailyTotals.get(dateKey) || {
        revenue: 0,
        orders: 0,
      };

    existing.revenue += toFiniteNumber(
      order.totalAmount
    );

    existing.orders += 1;

    dailyTotals.set(dateKey, existing);
  }

  if (dailyTotals.size === 0) {
    return [];
  }

  // -------------------------------------------------------
  // NORMALIZE FORECAST HISTORY WINDOW
  // -------------------------------------------------------

  const normalizedStart = new Date(startDate);
  const normalizedEnd = new Date(endDate);

  if (
    Number.isNaN(normalizedStart.getTime()) ||
    Number.isNaN(normalizedEnd.getTime())
  ) {
    return [];
  }

  normalizedStart.setUTCHours(
    0,
    0,
    0,
    0
  );

  normalizedEnd.setUTCHours(
    0,
    0,
    0,
    0
  );

  // -------------------------------------------------------
  // BUILD CONTINUOUS DAILY TIME SERIES
  // -------------------------------------------------------

  const history = [];

  const currentDate = new Date(
    normalizedStart
  );

  while (currentDate <= normalizedEnd) {
    const dateKey = currentDate
      .toISOString()
      .slice(0, 10);

    const totals =
      dailyTotals.get(dateKey);

    history.push({
      date: dateKey,

      revenue: round(
        totals?.revenue ?? 0,
        2
      ),

      orders:
        totals?.orders ?? 0,

      // true only when the database actually contained
      // at least one completed order on this date.
      observed: dailyTotals.has(dateKey),
    });

    currentDate.setUTCDate(
      currentDate.getUTCDate() + 1
    );
  }

  return history;
}

/* =========================================================
   RUN MARKET BASKET ANALYSIS
========================================================= */

export async function runMarketBasketAnalysis(
  req,
  res
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const orders =
      await prisma.order.findMany({
        where: {
          userId,
          status: COMPLETED_ORDER_STATUS,
        },

        select: {
          id: true,

          items: {
            select: {
              productId: true,
            },
          },
        },
      });

    const transactions = orders
  .map((order) => ({
    orderId: order.id,
    items: [
      ...new Set(
        order.items
          .map((item) => item.productId)
          .filter(
            (productId) =>
              typeof productId === "string" &&
              productId.trim().length > 0
          )
      ),
    ],
  }))
  .filter((transaction) => transaction.items.length > 0);

    if (process.env.DEBUG_MARKET_BASKET === "true") {
      console.log(
        "[market-basket] transactions:",
        transactions.length,
        "sizes:",
        transactions.map(
          (transaction) => transaction.items.length
        )
      );
    }

    /*
     * -------------------------------------------------------
     * VALIDATE TRANSACTION DATA
     * -------------------------------------------------------
     */

    if (
      transactions.length === 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "No completed order transactions are available for Market Basket Analysis.",
      });
    }

    /*
     * Determine the number of unique products available
     * across all completed transactions.
     */

    const uniqueProducts =
      new Set(
        transactions.flatMap(
          (transaction) =>
            transaction.items
        )
      );

    if (
      uniqueProducts.size < 2
    ) {
      return res.status(400).json({
        success: false,

        message:
          "At least two unique products are required for Market Basket Analysis.",
      });
    }

    /*
     * -------------------------------------------------------
     * CALL FASTAPI MARKET BASKET SERVICE
     * -------------------------------------------------------
     *
     * Verified FastAPI endpoint:
     *
     * POST /api/ml/market-basket/analyze
     */

    const mlResult =
      await callMlService(
        "/api/ml/market-basket/analyze",
        {
          transactions,
        }
      );

    /*
     * -------------------------------------------------------
     * VALIDATE FASTAPI RESPONSE
     * -------------------------------------------------------
     */

    if (
      mlResult?.success !== true
    ) {
      throw new Error(
        "Market Basket ML service did not return a successful result."
      );
    }

    /*
     * -------------------------------------------------------
     * NORMALIZE FREQUENT ITEMSETS
     * -------------------------------------------------------
     */

    const frequentItemsets =
      Array.isArray(
        mlResult.frequentItemsets
      )
        ? mlResult.frequentItemsets
        : [];

    /*
     * -------------------------------------------------------
     * NORMALIZE ASSOCIATION RULES
     * -------------------------------------------------------
     */

    const rules =
      Array.isArray(
        mlResult.rules
      )
        ? mlResult.rules
        : [];

    /*
     * -------------------------------------------------------
     * MODEL METADATA
     * -------------------------------------------------------
     */

    const modelVersion =
      typeof mlResult.modelVersion ===
        "string" &&
      mlResult.modelVersion.trim()
        ? mlResult.modelVersion.trim()
        : "apriori-market-basket-v1";

    const algorithm =
      typeof mlResult.algorithm ===
        "string" &&
      mlResult.algorithm.trim()
        ? mlResult.algorithm.trim()
        : "apriori";

    const analysisDate =
      new Date();

    const datasetId =
      await getLatestDatasetId(userId);

    /*
     * -------------------------------------------------------
     * SUMMARY METRICS
     * -------------------------------------------------------
     *
     * Prefer values calculated by FastAPI.
     *
     * If one of the summary values is missing, use the
     * transaction/rule data already available in this
     * controller as a safe fallback.
     */

    const transactionCount =
      toFiniteNumber(
        mlResult.transactionCount,
        transactions.length
      );

    const uniqueProductCount =
      toFiniteNumber(
        mlResult.uniqueProductCount,
        uniqueProducts.size
      );

    const frequentItemsetCount =
      toFiniteNumber(
        mlResult.frequentItemsetCount,
        frequentItemsets.length
      );

    const associationRuleCount =
      toFiniteNumber(
        mlResult.associationRuleCount,
        rules.length
      );

    const averageConfidence =
      round(
        mlResult.averageConfidence,
        4
      );

    const maximumLift =
      round(
        mlResult.maximumLift,
        4
      );

    /*
     * -------------------------------------------------------
     * STRONGEST ASSOCIATION RULE
     * -------------------------------------------------------
     */

    const strongestRule =
      mlResult.strongestRule &&
      typeof mlResult.strongestRule ===
        "object"
        ? mlResult.strongestRule
        : null;

    /*
     * -------------------------------------------------------
     * RESOLVE PRODUCT IDs TO PRODUCT DETAILS
     * -------------------------------------------------------
     *
     * FastAPI stays ID-only (transactions in, rules with
     * product IDs out) so the ML service never needs to know
     * about our Product schema. The Node/Prisma controller
     * resolves those IDs to name/category/price here, right
     * before the response is sent - persistence below still
     * stores the raw ID-based rule/strongestRule shape.
     */

    const ruleProductIds = [
      ...new Set(
        rules.flatMap((rule) => [
          ...(Array.isArray(rule.antecedents)
            ? rule.antecedents
            : []),
          ...(Array.isArray(rule.consequents)
            ? rule.consequents
            : []),
        ])
      ),
    ];

    const itemsetProductIds = [
      ...new Set(
        frequentItemsets.flatMap((itemset) =>
          Array.isArray(itemset.items)
            ? itemset.items
            : []
        )
      ),
    ];

    const allProductIds = [
      ...new Set([
        ...ruleProductIds,
        ...itemsetProductIds,
      ]),
    ];

    const ruleProducts =
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
      ruleProducts.map((product) => [
        product.id,
        product,
      ])
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

    const resolvedRules = rules.map((rule) => ({
      ...rule,
      antecedents: resolveProducts(
        rule.antecedents
      ),
      consequents: resolveProducts(
        rule.consequents
      ),
    }));

    const resolvedFrequentItemsets = frequentItemsets.map(
      (itemset) => ({
        ...itemset,
        items: resolveProducts(
          itemset.items
        ),
      })
    );

    const resolvedStrongestRule =
      strongestRule
        ? {
            ...strongestRule,
            antecedents: resolveProducts(
              strongestRule.antecedents
            ),
            consequents: resolveProducts(
              strongestRule.consequents
            ),
          }
        : null;

    /*
 * -------------------------------------------------------
 * PERSIST ANALYSIS + RULES ATOMICALLY
 * -------------------------------------------------------
 *
 * The previous analysis is removed and the new analysis
 * plus its rules are created inside a single transaction
 * so a failure partway through (e.g. rule creation)
 * cannot leave the user without any Market Basket
 * analysis, or with rules that don't match the stored
 * summary.
 */

const analysis = await prisma.$transaction(async (tx) => {
  await tx.marketBasketAnalysis.deleteMany({
    where: {
      userId,
    },
  });

  const createdAnalysis =
    await tx.marketBasketAnalysis.create({
      data: {
        userId,

        datasetId,

        algorithm,

        modelVersion,

        transactionCount,

        uniqueProductCount,

        frequentItemsetCount,

        associationRuleCount,

        averageConfidence,

        maximumLift,

        strongestRule,

        frequentItemsets,

        generatedAt: analysisDate,
      },
    });

  if (rules.length > 0) {
    await tx.marketBasketRule.createMany({
      data: rules.map((rule) => ({
        analysisId: createdAnalysis.id,

        userId,

        antecedent: rule.antecedents,

        consequent: rule.consequents,

        support: round(rule.support, 4),

        confidence: round(rule.confidence, 4),

        lift: round(rule.lift, 4),
      })),
    });
  }

  return createdAnalysis;
});

/*
 * -------------------------------------------------------
 * ACTIVITY LOG
 * -------------------------------------------------------
 *
 * Use the same activity logging implementation used by
 * your existing Segmentation / Churn / CLV controllers.
 *
 * If your project already has createActivity(),
 * Activity model, AuditLog, or UserActivity,
 * insert that existing call here.
 *
 * Example:
 *
 * await prisma.activity.create({
 *   data:{
 *      userId,
 *      type:"MARKET_BASKET_ANALYSIS",
 *      title:"Market Basket Analysis completed"
 *   }
 * });
 *
 * Do NOT create a new logging system if one
 * already exists.
 */

    return res.status(200).json({
      success: true,

      message:
        "Market Basket Analysis completed successfully.",

      data: {
        algorithm,

        modelVersion,

        transactionCount,

        uniqueProductCount,

        frequentItemsetCount,

        associationRuleCount,

        averageConfidence,

        maximumLift,

        strongestRule: resolvedStrongestRule,

        frequentItemsets: resolvedFrequentItemsets,

        rules: resolvedRules,

        analysisDate:
          analysisDate.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Market Basket Analysis controller error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to run Market Basket Analysis.",
    });
  }
}

/* =========================================================
   RUN PRODUCT RECOMMENDATIONS
========================================================= */

export async function runProductRecommendations(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    /* -------------------------------------------------------
       LOAD DATA
    ------------------------------------------------------- */

    const customers = await prisma.customer.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
      },
    });

    const products = await prisma.product.findMany({
  where: { userId },
  select: {
    id: true,
    name: true,
    category: true,
  },
});

    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: COMPLETED_ORDER_STATUS,
      },
      include: {
        items: true,
      },
    });

    const rules =
      await prisma.marketBasketRule.findMany({
        where: {
          userId,
        },
      });

    if (
      customers.length === 0 ||
      products.length === 0 ||
      orders.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient data to generate recommendations.",
      });
    }

    /* -------------------------------------------------------
       LOAD LATEST CUSTOMER SEGMENTS
       (most recent segmentation run wins per customer)
    ------------------------------------------------------- */

    const segmentRecords =
      await prisma.customerSegment.findMany({
        where: { userId },
        select: {
          customerId: true,
          segmentName: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const customerSegments = {};

    for (const record of segmentRecords) {
      if (!(record.customerId in customerSegments)) {
        customerSegments[record.customerId] =
          record.segmentName ?? null;
      }
    }

    /* -------------------------------------------------------
       BUILD FASTAPI REQUEST
    ------------------------------------------------------- */

    const payload = {
      customers: customers.map((c) => ({
        customerId: c.id,
        customerName: c.name,
        segment: customerSegments[c.id] ?? null,
      })),

      products: products.map((p) => ({
  productId: p.id,
  productName: p.name,
  category: p.category ?? null,
})),

      orders: orders.flatMap((order) =>
        order.items.map((item) => ({
          customerId: order.customerId,
          productId: item.productId,
        }))
      ),

      marketBasketRules: rules.map((rule) => ({
        antecedents: rule.antecedent,
        consequents: rule.consequent,
        confidence: rule.confidence,
        lift: rule.lift,
      })),
    };

    /* -------------------------------------------------------
       CALL FASTAPI
    ------------------------------------------------------- */

    const mlResult = await callMlService(
      "/api/ml/recommendations/generate",
      payload
    );

    if (!mlResult.success) {
      throw new Error("Recommendation service failed.");
    }

    if (!Array.isArray(mlResult.recommendations)) {
      throw new Error(
        "Invalid recommendation response: recommendations must be an array."
      );
    }

    /* -------------------------------------------------------
       VALIDATE DATABASE OWNERSHIP
    ------------------------------------------------------- */

    const validCustomerIds = new Set(
      customers.map((customer) => customer.id)
    );

    const validProductIds = new Set(
      products.map((product) => product.id)
    );

    /* -------------------------------------------------------
       BUILD RECOMMENDATION ROWS
    ------------------------------------------------------- */

    const recommendationRows = [];

    const datasetId = await getLatestDatasetId(userId);

    for (const customer of mlResult.recommendations) {
      if (!validCustomerIds.has(customer.customerId)) {
        throw new Error(
          `Invalid customer ID returned by ML service: ${customer.customerId}`
        );
      }

      if (!Array.isArray(customer.recommendedProducts)) {
        throw new Error(
          `Invalid recommendations for customer: ${customer.customerId}`
        );
      }

      for (const recommendation of customer.recommendedProducts) {
        if (!validProductIds.has(recommendation.productId)) {
          throw new Error(
            `Invalid product ID returned by ML service: ${recommendation.productId}`
          );
        }

        const score = Number(recommendation.score);

        if (!Number.isFinite(score)) {
          throw new Error(
            `Invalid recommendation score for product: ${recommendation.productId}`
          );
        }

        const reason =
          typeof recommendation.reason === "string" &&
          recommendation.reason.trim()
            ? recommendation.reason.trim()
            : null;

        recommendationRows.push({
          userId,
          datasetId,
          customerId: customer.customerId,
          productId: recommendation.productId,
          score,
          algorithm: mlResult.algorithm,
          reason,
          generatedAt: new Date(),
        });
      }
    }
    console.log(
  "RECOMMENDATION PRODUCT CATEGORIES:",
  products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
  }))
);

    /* -------------------------------------------------------
       ATOMICALLY REPLACE PREVIOUS RECOMMENDATIONS
    ------------------------------------------------------- */

    await prisma.$transaction(async (tx) => {
      await tx.productRecommendation.deleteMany({
        where: {
          userId,
        },
      });

      if (recommendationRows.length > 0) {
        await tx.productRecommendation.createMany({
          data: recommendationRows,
        });
      }
    });

    /* -------------------------------------------------------
       SUCCESS
    ------------------------------------------------------- */

    return res.status(200).json({
      success: true,

      message:
        "Product Recommendations generated successfully.",

      data: {
        algorithm: mlResult.algorithm,

        modelVersion: mlResult.modelVersion,

        recommendationCount:
          recommendationRows.length,

        recommendations:
          mlResult.recommendations,

        generatedAt:
          new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Recommendation controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate product recommendations.",
    });
  }
}

/* =========================================================
   RUN SALES FORECAST

   POST /api/analytics/forecast/run

   Pipeline:
   PostgreSQL
      â†“
   Express / Prisma
      â†“
   Daily Revenue Aggregation
      â†“
   FastAPI
      â†“
   Forecasting Model
      â†“
   SalesForecast
========================================================= */

const MIN_FORECAST_HORIZON_DAYS = 1;
const MAX_FORECAST_HORIZON_DAYS = 365;
const DEFAULT_FORECAST_HORIZON_DAYS = 30;

const FORECAST_HISTORY_LOOKBACK_DAYS = 90;
const MIN_FORECAST_HISTORY_POINTS = 7;

export async function runSalesForecast(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    /*
     * -------------------------------------------------------
     * VALIDATE FORECAST HORIZON
     * -------------------------------------------------------
     */

    const requestedHorizon = Number(
      req.body?.horizon
    );

    const horizonDays = Number.isInteger(
      requestedHorizon
    )
      ? Math.min(
          MAX_FORECAST_HORIZON_DAYS,
          Math.max(
            MIN_FORECAST_HORIZON_DAYS,
            requestedHorizon
          )
        )
      : DEFAULT_FORECAST_HORIZON_DAYS;

    /*
     * -------------------------------------------------------
     * LOAD COMPLETED ORDER HISTORY
     * -------------------------------------------------------
     */

    const historyStartDate = new Date();

historyStartDate.setUTCHours(
  0,
  0,
  0,
  0
);

historyStartDate.setUTCDate(
  historyStartDate.getUTCDate() -
    (FORECAST_HISTORY_LOOKBACK_DAYS - 1)
);

const orders = await prisma.order.findMany({
  where: {
    userId,
    status: COMPLETED_ORDER_STATUS,

    orderDate: {
      gte: historyStartDate,
    },
  },

  select: {
    orderDate: true,
    totalAmount: true,
  },

  orderBy: {
    orderDate: "asc",
  },
});

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,

        message:
          "No completed orders are available to generate a sales forecast.",
      });
    }

    const dataQuality =
      calculateForecastDataQuality(orders);
    const history =
      buildDailyRevenueHistory(
        orders,
        historyStartDate,
        new Date()
      );
      console.log(
  "========== DAILY HISTORY =========="
);

console.log(
  JSON.stringify(history, null, 2)
);

console.log(
  "==================================="
);
    console.log(
  "\n========== SALES FORECAST HISTORY =========="
);

console.log(
  "Lookback days:",
  FORECAST_HISTORY_LOOKBACK_DAYS
);

console.log(
  "Orders loaded:",
  orders.length
);

console.log(
  "History points:",
  history.length
);

console.log(
  "First history date:",
  history[0]?.date ?? null
);

console.log(
  "Last history date:",
  history[history.length - 1]?.date ?? null
);

console.log(
  "Observed days:",
  history.filter(
    (point) => point.observed === true
  ).length
);

console.log(
  "============================================\n"
);

    if (
      history.length < MIN_FORECAST_HISTORY_POINTS
    ) {
      return res.status(400).json({
        success: false,

        message: `At least ${MIN_FORECAST_HISTORY_POINTS} days of order history are required to generate a sales forecast.`,
      });
    }

    /*
     * -------------------------------------------------------
     * CALL FASTAPI FORECASTING SERVICE
     * -------------------------------------------------------
     *
     * Verified FastAPI endpoint:
     *
     * POST /api/ml/forecast/predict
     */

    console.log(
  "========== FORECAST ML INPUT =========="
);

console.log(
  JSON.stringify(
    {
      historyLength: history.length,
      firstHistoryPoints: history.slice(0, 10),
      lastHistoryPoints: history.slice(-10),
    },
    null,
    2
  )
);

console.log(
  "========================================"
);

    const mlResult = await callMlService(
      "/api/ml/forecast/predict",
      {
        history,
        horizonDays,
      }
    );
    console.log(
  "========== RAW ML FORECAST RESPONSE =========="
);

console.log(
  JSON.stringify(
    mlResult,
    null,
    2
  )
);

console.log(
  "=============================================="
);

    if (mlResult?.success !== true) {
      throw new Error(
        "Forecasting ML service did not return a successful result."
      );
    }

    const forecastPoints = Array.isArray(
      mlResult.forecast
    )
      ? mlResult.forecast
      : [];

    if (forecastPoints.length === 0) {
      throw new Error(
        "Forecasting ML service returned no forecast points."
      );
    }

    /*
     * -------------------------------------------------------
     * VALIDATE FASTAPI RESPONSE
     * -------------------------------------------------------
     */

    const invalidPoint = forecastPoints.find((point) => {
      if (
        !point ||
        Number.isNaN(new Date(point.date).getTime()) ||
        !Number.isFinite(Number(point.predictedRevenue))
      ) {
        return true;
      }

      if (
        point.predictedOrders !== null &&
        point.predictedOrders !== undefined &&
        !Number.isFinite(Number(point.predictedOrders))
      ) {
        return true;
      }

      if (
        point.lowerBound !== null &&
        point.lowerBound !== undefined &&
        !Number.isFinite(Number(point.lowerBound))
      ) {
        return true;
      }

      if (
        point.upperBound !== null &&
        point.upperBound !== undefined &&
        !Number.isFinite(Number(point.upperBound))
      ) {
        return true;
      }

      return false;
    });

    if (invalidPoint) {
  throw new Error(
    "Forecasting ML service returned an invalid forecast point."
  );
}

/*
 * -------------------------------------------------------
 * VALIDATE ORDERS × AOV = REVENUE
 * -------------------------------------------------------
 */

const inconsistentPoint = forecastPoints.find((point) => {
  const orders =
    point.predictedOrders != null
      ? Number(point.predictedOrders)
      : Number(point.expectedOrders);

  const aov =
    Number(point.predictedAOV);

  const revenue =
    Number(point.predictedRevenue);

  if (
    !Number.isFinite(orders) ||
    !Number.isFinite(aov) ||
    !Number.isFinite(revenue)
  ) {
    return false;
  }

  const calculatedRevenue =
    orders * aov;

  return (
    Math.abs(
      calculatedRevenue - revenue
    ) > 1.00
  );
});

if (inconsistentPoint) {
  throw new Error(
    `Forecast invariant failed for ${inconsistentPoint.date}: ` +
    `expected orders × AOV does not equal predicted revenue.`
  );
}

    /*
     * -------------------------------------------------------
     * MODEL METADATA
     * -------------------------------------------------------
     */

    const modelVersion =
      typeof mlResult.modelVersion === "string" &&
      mlResult.modelVersion.trim()
        ? mlResult.modelVersion.trim()
        : "sales-forecast-v1";

    const algorithm =
      typeof mlResult.algorithm === "string" &&
      mlResult.algorithm.trim()
        ? mlResult.algorithm.trim()
        : "prophet";

    const generatedAt = new Date();

    const datasetId = await getLatestDatasetId(
      userId
    );

    /*
     * -------------------------------------------------------
     * HOLDOUT ACCURACY METRICS
     * -------------------------------------------------------
     *
     * These come from FastAPI once the forecasting service
     * computes real holdout MAE/RMSE/MAPE. Until then they
     * are simply null and the dashboard should render that
     * as "not yet available" rather than a zero.
     */

    const toNullableMetric = (value) =>
      value === null || value === undefined
        ? null
        : Number.isFinite(Number(value))
          ? round(Number(value), 4)
          : null;

    const mae = toNullableMetric(mlResult.mae);
    const rmse = toNullableMetric(mlResult.rmse);
    const mape = toNullableMetric(mlResult.mape);
    const wape = toNullableMetric(mlResult.wape);
    const smape = toNullableMetric(mlResult.smape);

    const evaluationDays =
      Number.isInteger(Number(mlResult.evaluationDays))
      ? Number(mlResult.evaluationDays)
      : null;

    const evaluation = mlResult?.evaluation ?? null;  
    /*
     * -------------------------------------------------------
     * PREPARE PRISMA RECORDS
     * -------------------------------------------------------
     */

    const records = forecastPoints.map((point) => ({
      forecastDate: new Date(point.date),

      predictedRevenue: round(
        Number(point.predictedRevenue),
        2
      ),

      expectedOrders:
        point.expectedOrders === null ||
        point.expectedOrders === undefined
          ? null
          : round(
              Number(point.expectedOrders),
              4
            ),

      predictedOrders:
        point.predictedOrders === null ||
        point.predictedOrders === undefined
          ? null
          : Math.round(
              Number(point.predictedOrders)
            ),

      predictedAOV:
        point.predictedAOV === null ||
        point.predictedAOV === undefined
          ? null
          : round(Number(point.predictedAOV), 2),

      lowerBound:
        point.lowerBound === null ||
        point.lowerBound === undefined
          ? null
          : round(Number(point.lowerBound), 2),

      upperBound:
        point.upperBound === null ||
        point.upperBound === undefined
          ? null
          : round(Number(point.upperBound), 2),

      mae,
      rmse,
      mape,
      wape,
      smape,
      evaluationDays,

      algorithm,

      modelVersion,

      generatedAt,

      userId,

      datasetId,
    }));

    /*
     * -------------------------------------------------------
     * ATOMICALLY REPLACE PREVIOUS FORECAST
     * -------------------------------------------------------
     *
     * Keep only the latest forecast run for each user so
     * the dashboard always reflects the most recent horizon
     * rather than a mix of old and new predictions.
     */

    await prisma.$transaction(async (tx) => {
      await tx.salesForecast.deleteMany({
        where: {
          userId,
        },
      });

      await tx.salesForecast.createMany({
        data: records,
      });
    });

    /*
     * -------------------------------------------------------
     * RESPONSE SUMMARY
     * -------------------------------------------------------
     */

    const totalPredictedRevenue = round(
      records.reduce(
        (total, record) =>
          total + record.predictedRevenue,
        0
      ),
      2
    );

    const modelDiagnostics =
      mlResult?.modelDiagnostics ?? null;

    const baselineComparison =
      mlResult?.baselineComparison ?? null;

    const modelComparison =
      mlResult?.modelComparison ?? null;

    // Interpretation layer only -- reads the already-computed
    // V4.1 forecast/diagnostics/data-quality and derives
    // human-facing insights. Does not touch V4.1 predictions,
    // orders, AOV, revenue, or WAPE.
    //
    // historicalPoints is the actual observed daily series
    // (not the forecast), so demand/AOV/revenue trends compare
    // the forecast against what the business is experiencing
    // right now, rather than comparing one forecast week
    // against another.
    const businessInsights = generateForecastInsights({
      forecastPoints,
      historicalPoints: history,
      modelDiagnostics,
      dataQuality,
    });

    /*
     * -------------------------------------------------------
     * FORECAST EXPLAINABILITY
     * -------------------------------------------------------
     *
     * Uses whichever property actually contains the forecast
     * points on mlResult -- older ML service responses used
     * "forecast", so we fall back to "points" if present.
     * Named separately from the earlier `forecastPoints` const
     * (already validated/derived from mlResult.forecast above)
     * to avoid redeclaring it in this scope.
     */

    const explainabilityInput = Array.isArray(
      mlResult?.forecast
    )
      ? mlResult.forecast
      : Array.isArray(mlResult?.points)
        ? mlResult.points
        : [];

    const forecastExplainability =
  generateForecastExplainability(
    explainabilityInput
  );

/*
 * -------------------------------------------------------
 * FORECAST NOTIFICATIONS
 * -------------------------------------------------------
 *
 * Consumes the already-generated business insights
 * and explainability output.
 *
 * This does not modify the V4.1 forecast or its metrics.
 */
await generateForecastNotifications({
  userId,
  businessInsights,
  forecastExplainability,
});

return res.status(200).json({
      success: true,

      message:
        "Sales forecast generated successfully.",

      data: {
        algorithm,
        
        modelVersion,

        horizon: horizonDays,

        historyPoints: history.length,

        forecastCount: records.length,

        totalPredictedRevenue,

        mae,
        rmse,
        mape,
        wape,
        smape,
        evaluationDays,
        evaluation,

        dataQuality,

        modelDiagnostics,
        baselineComparison,
        modelComparison,

        businessInsights,

        forecastExplainability,

        points: records.map((record) => ({
          period: record.forecastDate.toISOString(),
          predictedRevenue: record.predictedRevenue,
          expectedOrders: record.expectedOrders,
          predictedOrders: record.predictedOrders,
          predictedAOV: record.predictedAOV,
          lowerBound: record.lowerBound,
          upperBound: record.upperBound,
        })),

        generatedAt: generatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Sales forecast controller error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to generate sales forecast.",
    });
  }
}