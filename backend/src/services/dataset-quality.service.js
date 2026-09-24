import fs from "fs";
import csv from "csv-parser";

const REQUIRED_COLUMNS = [
  "customer_id",
  "order_id",
  "order_date",
  "product_id",
  "product_name",
  "quantity",
  "unit_price",
];

function normalizeColumnName(value) {
  return String(value)
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeRow(row) {
  const normalized = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeColumnName(key)] =
      typeof value === "string" ? value.trim() : value;
  }

  return normalized;
}

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  );
}

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    const stream = fs.createReadStream(filePath);

    stream
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);

    stream.on("error", reject);
  });
}

function addIssue(collection, type, field, message, count = 1) {
  collection.push({
    type,
    field,
    message,
    count,
  });
}

export async function analyzeDatasetQuality(filePath) {
  const rawRows = await parseCSV(filePath);

  if (!rawRows.length) {
    return {
      valid: false,
      qualityScore: 0,
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
      },
      columns: {
        present: [],
        missing: REQUIRED_COLUMNS,
        unexpected: [],
      },
      issues: [
        {
          type: "error",
          field: "file",
          message: "The uploaded CSV file is empty.",
          count: 1,
        },
      ],
      recommendations: [
        "Upload a CSV file containing at least one data row.",
      ],
    };
  }

  const rows = rawRows.map(normalizeRow);
  const columns = Object.keys(rows[0] || {});

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !columns.includes(column)
  );

  const unexpectedColumns = columns.filter(
    (column) => !REQUIRED_COLUMNS.includes(column)
  );

  const issues = [];

  if (missingColumns.length > 0) {
    addIssue(
      issues,
      "error",
      "columns",
      `Missing required columns: ${missingColumns.join(", ")}`,
      missingColumns.length
    );
  }

  let validRows = 0;
  let invalidRows = 0;
  let duplicateRows = 0;

  const duplicateKeys = new Map();

  let missingCustomerIds = 0;
  let missingOrderIds = 0;
  let missingProductIds = 0;
  let missingProductNames = 0;
  let invalidDates = 0;
  let invalidQuantities = 0;
  let invalidPrices = 0;

  for (const row of rows) {
    let rowValid = true;

    if (isEmpty(row.customer_id)) {
      missingCustomerIds += 1;
      rowValid = false;
    }

    if (isEmpty(row.order_id)) {
      missingOrderIds += 1;
      rowValid = false;
    }

    if (isEmpty(row.product_id)) {
      missingProductIds += 1;
      rowValid = false;
    }

    if (isEmpty(row.product_name)) {
      missingProductNames += 1;
      rowValid = false;
    }

    const quantity = Number.parseInt(row.quantity, 10);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      invalidQuantities += 1;
      rowValid = false;
    }

    const unitPrice = Number.parseFloat(row.unit_price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      invalidPrices += 1;
      rowValid = false;
    }

    const orderDate = new Date(row.order_date);

    if (Number.isNaN(orderDate.getTime())) {
      invalidDates += 1;
      rowValid = false;
    }

    const duplicateKey = [
      row.order_id,
      row.product_id,
      row.quantity,
      row.unit_price,
      row.discount || "0",
    ].join("::");

    const existingCount = duplicateKeys.get(duplicateKey) || 0;

    if (existingCount > 0) {
      duplicateRows += 1;
    }

    duplicateKeys.set(duplicateKey, existingCount + 1);

    if (rowValid) {
      validRows += 1;
    } else {
      invalidRows += 1;
    }
  }

  if (missingCustomerIds > 0) {
    addIssue(
      issues,
      "error",
      "customer_id",
      "Rows are missing customer IDs.",
      missingCustomerIds
    );
  }

  if (missingOrderIds > 0) {
    addIssue(
      issues,
      "error",
      "order_id",
      "Rows are missing order IDs.",
      missingOrderIds
    );
  }

  if (missingProductIds > 0) {
    addIssue(
      issues,
      "error",
      "product_id",
      "Rows are missing product IDs.",
      missingProductIds
    );
  }

  if (missingProductNames > 0) {
    addIssue(
      issues,
      "error",
      "product_name",
      "Rows are missing product names.",
      missingProductNames
    );
  }

  if (invalidDates > 0) {
    addIssue(
      issues,
      "error",
      "order_date",
      "Rows contain invalid order dates.",
      invalidDates
    );
  }

  if (invalidQuantities > 0) {
    addIssue(
      issues,
      "error",
      "quantity",
      "Rows contain invalid quantities. Quantity must be a positive integer.",
      invalidQuantities
    );
  }

  if (invalidPrices > 0) {
    addIssue(
      issues,
      "error",
      "unit_price",
      "Rows contain invalid unit prices.",
      invalidPrices
    );
  }

  if (duplicateRows > 0) {
    addIssue(
      issues,
      "warning",
      "duplicates",
      "Duplicate order/product rows were detected.",
      duplicateRows
    );
  }

  const recommendations = [];

  if (missingColumns.length > 0) {
    recommendations.push(
      "Add all required columns before importing the dataset."
    );
  }

  if (invalidRows > 0) {
    recommendations.push(
      "Review invalid rows before importing the dataset."
    );
  }

  if (duplicateRows > 0) {
    recommendations.push(
      "Review duplicate order/product rows to avoid duplicate transactions."
    );
  }

  if (
    missingColumns.length === 0 &&
    invalidRows === 0 &&
    duplicateRows === 0
  ) {
    recommendations.push(
      "Dataset passed all available quality checks and is ready for import."
    );
  }

  const totalRows = rows.length;

  const validityScore =
    totalRows > 0
      ? (validRows / totalRows) * 100
      : 0;

  const duplicatePenalty =
    totalRows > 0
      ? (duplicateRows / totalRows) * 10
      : 0;

  const columnPenalty =
    missingColumns.length > 0
      ? 30
      : 0;

  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        validityScore -
          duplicatePenalty -
          columnPenalty
      )
    )
  );

  const qualityStatus =
    qualityScore >= 90
      ? "excellent"
      : qualityScore >= 75
        ? "good"
        : qualityScore >= 50
          ? "needs_review"
          : "poor";

  return {
    valid:
      missingColumns.length === 0 &&
      validRows > 0,

    qualityScore,

    qualityStatus,

    summary: {
      totalRows,
      validRows,
      invalidRows,
      duplicateRows,
    },

    columns: {
      present: columns,
      required: REQUIRED_COLUMNS,
      missing: missingColumns,
      unexpected: unexpectedColumns,
    },

    issues,

    recommendations,
  };
}

export {
  REQUIRED_COLUMNS,
  normalizeColumnName,
};