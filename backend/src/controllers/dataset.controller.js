import fs from "fs";
import csv from "csv-parser";
import {
  analyzeDatasetQuality,
} from "../services/dataset-quality.service.js";

import prisma from "../lib/prisma.js";

/* =========================================================
   CSV CONFIGURATION
========================================================= */

const REQUIRED_COLUMNS = [
  "customer_id",
  "order_id",
  "order_date",
  "product_id",
  "product_name",
  "quantity",
  "unit_price",
];

/* =========================================================
   HELPERS
========================================================= */

/**
 * Get authenticated user ID.
 */
function getUserId(req) {
  return req.user?.userId || req.user?.id;
}

/**
 * Safely convert Prisma Decimal/string/number
 * values to JavaScript numbers.
 */
function toNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

/**
 * Remove a temporary uploaded file.
 */
function removeFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(
      "Unable to remove uploaded file:",
      error
    );
  }
}

/**
 * Normalize a CSV column name.
 *
 * Example:
 *
 * Customer ID -> customer_id
 * Product Name -> product_name
 */
function normalizeColumnName(value) {
  return String(value)
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Normalize one CSV row.
 */
function normalizeRow(row) {
  const normalized = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey =
      normalizeColumnName(key);

    normalized[normalizedKey] =
      typeof value === "string"
        ? value.trim()
        : value;
  }

  return normalized;
}

/**
 * Parse CSV file.
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    const stream =
      fs.createReadStream(filePath);

    stream
      .pipe(
        csv({
          skipLines: 0,
        })
      )
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", () => {
        resolve(rows);
      })
      .on("error", (error) => {
        reject(error);
      });

    stream.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Convert optional CSV values to null.
 */
function optionalValue(value) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  return String(value).trim();
}

/* =========================================================
   UPLOAD DATASET

   POST /api/datasets/upload
========================================================= */

export async function uploadDataset(req, res) {
  let dataset = null;

  try {
    const userId = getUserId(req);

    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    if (!userId) {
      removeFile(req.file?.path);

      return res.status(401).json({
        success: false,
        authenticated: false,
        message:
          "Authentication required.",
      });
    }

    /* =====================================================
       FILE VALIDATION
    ===================================================== */

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload a CSV file.",
      });
    }

    if (!req.file.path) {
      return res.status(400).json({
        success: false,
        message:
          "Uploaded file could not be processed.",
      });
    }

    /* =====================================================
       PARSE CSV
    ===================================================== */

    const rows =
      await parseCSV(req.file.path);

    if (!rows.length) {
      removeFile(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          "The uploaded CSV file is empty.",
      });
    }

    /* =====================================================
       NORMALIZE CSV
    ===================================================== */

    const normalizedRows =
      rows.map(normalizeRow);

    /* =====================================================
       VALIDATE REQUIRED COLUMNS
    ===================================================== */

    const columns =
      Object.keys(normalizedRows[0]);

    const missingColumns =
      REQUIRED_COLUMNS.filter(
        (column) =>
          !columns.includes(column)
      );

    if (missingColumns.length > 0) {
      removeFile(req.file.path);

      return res.status(400).json({
        success: false,

        message:
          "CSV file is missing required columns.",

        requiredColumns:
          REQUIRED_COLUMNS,

        missingColumns,
      });
    }

    /* =====================================================
       CREATE DATASET
    ===================================================== */

    const requestedName =
      typeof req.body?.name === "string"
        ? req.body.name.trim()
        : "";

    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";

    dataset =
      await prisma.dataset.create({
        data: {
          name:
            requestedName ||
            req.file.originalname,

          originalName:
            req.file.originalname,

          fileName:
            req.file.filename,

          description:
            description || null,

          rowCount:
            normalizedRows.length,

          status:
            "processing",

          userId,
        },
      });

    /* =====================================================
       IMPORT TRACKING
    ===================================================== */

    const customerIds = new Set();

    const productIds = new Set();

    const orderIds = new Set();

    /*
     * Prevent duplicate OrderItem creation when the
     * exact same product/order row appears more than once.
     *
     * This protects a single upload operation.
     */
    const processedRows = new Set();

    let importedItems = 0;

    let skippedRows = 0;

    /* =====================================================
       PROCESS CSV ROWS
    ===================================================== */

    for (
      let index = 0;
      index < normalizedRows.length;
      index += 1
    ) {
      const row =
        normalizedRows[index];

      /* ---------------------------------------------------
         REQUIRED IDENTIFIERS
      --------------------------------------------------- */

      const customerExternalId =
        optionalValue(
          row.customer_id
        );

      const orderExternalId =
        optionalValue(
          row.order_id
        );

      const productExternalId =
        optionalValue(
          row.product_id
        );

      const productName =
        optionalValue(
          row.product_name
        );

      if (
        !customerExternalId ||
        !orderExternalId ||
        !productExternalId ||
        !productName
      ) {
        skippedRows += 1;
        continue;
      }

      /* ---------------------------------------------------
         NUMERIC VALUES
      --------------------------------------------------- */

      const quantity =
        Number.parseInt(
          row.quantity,
          10
        );

      const unitPrice =
        Number.parseFloat(
          row.unit_price
        );

      const parsedDiscount =
        Number.parseFloat(
          row.discount || "0"
        );

      const safeDiscount =
        Number.isFinite(
          parsedDiscount
        )
          ? Math.max(
              0,
              parsedDiscount
            )
          : 0;

      /* ---------------------------------------------------
         DATE
      --------------------------------------------------- */

      const orderDate =
        new Date(
          row.order_date
        );

      /* ---------------------------------------------------
         ROW VALIDATION
      --------------------------------------------------- */

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        Number.isNaN(
          orderDate.getTime()
        )
      ) {
        skippedRows += 1;
        continue;
      }

      /* ---------------------------------------------------
         DUPLICATE ROW PROTECTION
      --------------------------------------------------- */

      const rowKey = [
        orderExternalId,
        productExternalId,
        quantity,
        unitPrice,
        safeDiscount,
      ].join("::");

      if (processedRows.has(rowKey)) {
        skippedRows += 1;
        continue;
      }

      processedRows.add(rowKey);

      /* ===================================================
         CUSTOMER
      =================================================== */

      const customer =
        await prisma.customer.upsert({
          where: {
            userId_externalId: {
              userId,
              externalId:
                customerExternalId,
            },
          },

          update: {
            name:
              optionalValue(
                row.customer_name
              ) || undefined,

            email:
              optionalValue(
                row.customer_email
              ) || undefined,

            country:
              optionalValue(
                row.country
              ) || undefined,

            city:
              optionalValue(
                row.city
              ) || undefined,

            datasetId:
              dataset.id,
          },

          create: {
            externalId:
              customerExternalId,

            name:
              optionalValue(
                row.customer_name
              ),

            email:
              optionalValue(
                row.customer_email
              ),

            country:
              optionalValue(
                row.country
              ),

            city:
              optionalValue(
                row.city
              ),

            userId,

            datasetId:
              dataset.id,
          },
        });

      customerIds.add(
        customer.id
      );

      /* ===================================================
         PRODUCT
      =================================================== */

      const product =
        await prisma.product.upsert({
          where: {
            userId_externalId: {
              userId,
              externalId:
                productExternalId,
            },
          },

          update: {
            name:
              productName,

            category:
              optionalValue(
                row.category
              ) || undefined,

            price:
              unitPrice,

            datasetId:
              dataset.id,
          },

          create: {
            externalId:
              productExternalId,

            name:
              productName,

            category:
              optionalValue(
                row.category
              ),

            price:
              unitPrice,

            userId,

            datasetId:
              dataset.id,
          },
        });

      productIds.add(
        product.id
      );

      /* ===================================================
         ITEM TOTAL
      =================================================== */

      const itemSubtotal =
        quantity * unitPrice;

      const totalPrice =
        Math.max(
          0,
          itemSubtotal -
            safeDiscount
        );

      /* ===================================================
         ORDER
      =================================================== */

      const order =
        await prisma.order.upsert({
          where: {
            userId_externalId: {
              userId,

              externalId:
                orderExternalId,
            },
          },

          update: {
            customerId:
              customer.id,

            orderDate,

            status:
              optionalValue(
                row.status
              ) ||
              "completed",

            paymentMethod:
              optionalValue(
                row.payment_method
              ) || undefined,

            channel:
              optionalValue(
                row.channel
              ) || undefined,

            datasetId:
              dataset.id,
          },

          create: {
            externalId:
              orderExternalId,

            orderDate,

            status:
              optionalValue(
                row.status
              ) ||
              "completed",

            /*
             * Recalculated after importing
             * every OrderItem.
             */
            totalAmount: 0,

            discount: 0,

            shippingCost: 0,

            paymentMethod:
              optionalValue(
                row.payment_method
              ),

            channel:
              optionalValue(
                row.channel
              ),

            userId,

            customerId:
              customer.id,

            datasetId:
              dataset.id,
          },
        });

      orderIds.add(
        order.id
      );

      /* ===================================================
         ORDER ITEM
      =================================================== */

      await prisma.orderItem.upsert({
        where: {
          orderId_productId: {
            orderId:
              order.id,

            productId:
              product.id,
          },
        },

        update: {
          quantity,

          unitPrice,

          discount:
            safeDiscount,

          totalPrice,
        },

        create: {
          quantity,

          unitPrice,

          discount:
            safeDiscount,

          totalPrice,

          orderId:
            order.id,

          productId:
            product.id,
        },
      });

      importedItems += 1;
    }

    /* =====================================================
       ENSURE AT LEAST ONE VALID ROW
    ===================================================== */

    if (importedItems === 0) {
      await prisma.dataset.update({
        where: {
          id: dataset.id,
        },

        data: {
          status: "failed",
        },
      });

      removeFile(req.file.path);

      return res.status(400).json({
        success: false,

        message:
          "No valid rows could be imported from the CSV file.",

        rows:
          normalizedRows.length,

        skippedRows,
      });
    }

    /* =====================================================
       RECALCULATE ORDER TOTALS
    ===================================================== */

    for (const orderId of orderIds) {
      const aggregation =
        await prisma.orderItem.aggregate({
          where: {
            orderId,
          },

          _sum: {
            totalPrice: true,
            discount: true,
          },
        });

      await prisma.order.update({
        where: {
          id: orderId,
        },

        data: {
          totalAmount:
            toNumber(
              aggregation._sum
                .totalPrice
            ),

          discount:
            toNumber(
              aggregation._sum
                .discount
            ),
        },
      });
    }

    /* =====================================================
       RECALCULATE CUSTOMER METRICS
    ===================================================== */

    for (
      const customerId of customerIds
    ) {
      const orders =
        await prisma.order.findMany({
          where: {
            customerId,
            userId,
          },

          select: {
            totalAmount: true,
            orderDate: true,
          },
        });

      const totalOrders =
        orders.length;

      const totalSpent =
        orders.reduce(
          (total, order) =>
            total +
            toNumber(
              order.totalAmount
            ),
          0
        );

      const averageOrderValue =
        totalOrders > 0
          ? totalSpent /
            totalOrders
          : 0;

      let lastPurchaseAt = null;

      if (orders.length > 0) {
        lastPurchaseAt =
          orders.reduce(
            (
              latest,
              order
            ) => {
              if (!latest) {
                return order.orderDate;
              }

              return (
                new Date(
                  order.orderDate
                ).getTime() >
                new Date(
                  latest
                ).getTime()
              )
                ? order.orderDate
                : latest;
            },
            null
          );
      }

      await prisma.customer.update({
        where: {
          id: customerId,
        },

        data: {
          totalOrders,

          totalSpent,

          averageOrderValue,

          lastPurchaseAt,
        },
      });
    }

    /* =====================================================
       COMPLETE DATASET
    ===================================================== */

    const completedDataset =
      await prisma.dataset.update({
        where: {
          id: dataset.id,
        },

        data: {
          status:
            "completed",
        },
      });

    /* =====================================================
       REMOVE TEMPORARY FILE
    ===================================================== */

    removeFile(
      req.file.path
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(201).json({
      success: true,

      message:
        "Dataset imported successfully.",

      dataset: {
        id:
          completedDataset.id,

        name:
          completedDataset.name,

        status:
          completedDataset.status,

        rows:
          normalizedRows.length,

        importedRows:
          importedItems,

        skippedRows,

        customers:
          customerIds.size,

        products:
          productIds.size,

        orders:
          orderIds.size,

        orderItems:
          importedItems,
      },
    });
  } catch (error) {
    console.error(
      "Dataset upload error:",
      error
    );

    /* =====================================================
       TEMP FILE CLEANUP
    ===================================================== */

    removeFile(
      req.file?.path
    );

    /* =====================================================
       MARK DATASET AS FAILED
    ===================================================== */

    if (dataset?.id) {
      try {
        await prisma.dataset.update({
          where: {
            id: dataset.id,
          },

          data: {
            status:
              "failed",
          },
        });
      } catch (updateError) {
        console.error(
          "Unable to update dataset status:",
          updateError
        );
      }
    }

    /* =====================================================
       PRISMA ERRORS
    ===================================================== */

    if (
      error?.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,

        message:
          "The dataset contains data that conflicts with an existing unique record.",
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "Unable to import dataset.",
    });
  }
}

/* =========================================================
   VALIDATE DATASET

   POST /api/datasets/validate

   Validates a CSV without importing it into PostgreSQL.
========================================================= */

export async function validateDataset(req, res) {
  try {
    const userId =
      req.user?.userId ||
      req.user?.id;

    if (!userId) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup failure.
        }
      }

      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a CSV file.",
      });
    }

    if (!req.file.path) {
      return res.status(400).json({
        success: false,
        message: "Uploaded file could not be processed.",
      });
    }

    const quality =
      await analyzeDatasetQuality(
        req.file.path
      );

    const response = {
      success: true,

      message:
        quality.valid
          ? "Dataset validation completed."
          : "Dataset validation found issues.",

      dataset: {
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },

      quality,
    };

    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error(
        "Unable to remove validation file:",
        cleanupError
      );
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error(
      "Dataset validation error:",
      error
    );

    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // Ignore cleanup failure.
      }
    }

    return res.status(
      error?.statusCode || 500
    ).json({
      success: false,
      message:
        error?.message ||
        "Unable to validate dataset.",
    });
  }
}

/* =========================================================
   GET DATASETS

   GET /api/datasets
========================================================= */

export async function getDatasets(req, res) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message:
          "Authentication required.",
      });
    }

    const datasets =
      await prisma.dataset.findMany({
        where: {
          userId,
        },

        orderBy: {
          uploadedAt:
            "desc",
        },

        select: {
          id: true,

          name: true,

          originalName: true,

          description: true,

          rowCount: true,

          status: true,

          uploadedAt: true,
        },
      });

    return res.status(200).json({
      success: true,

      count:
        datasets.length,

      data:
        datasets,
    });
  } catch (error) {
    console.error(
      "Get datasets error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to retrieve datasets.",
    });
  }
}