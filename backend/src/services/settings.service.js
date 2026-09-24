import prisma from "../lib/prisma.js";

const DEFAULT_SETTINGS = {
  forecastAlerts: true,
  riskAlerts: true,
  recommendationAlerts: true,
  emailNotifications: true,
  theme: "dark",
  dashboardDensity: "comfortable",
  defaultForecastHorizon: 30,
  defaultDateRange: "30d",
};

const ALLOWED_FORECAST_HORIZONS = [7, 14, 30, 60, 90];
const ALLOWED_DATE_RANGES = ["7d", "30d", "90d", "180d"];
const ALLOWED_DENSITIES = ["comfortable", "compact"];
const ALLOWED_THEMES = ["dark"];

function validateBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean.`);
  }

  return value;
}

function validateSettingsPayload(payload = {}) {
  const data = {};

  const booleanFields = [
    "forecastAlerts",
    "riskAlerts",
    "recommendationAlerts",
    "emailNotifications",
  ];

  for (const field of booleanFields) {
    if (payload[field] !== undefined) {
      data[field] = validateBoolean(payload[field], field);
    }
  }

  if (payload.theme !== undefined) {
    if (
      typeof payload.theme !== "string" ||
      !ALLOWED_THEMES.includes(payload.theme)
    ) {
      throw new Error(
        `theme must be one of: ${ALLOWED_THEMES.join(", ")}.`
      );
    }

    data.theme = payload.theme;
  }

  if (payload.dashboardDensity !== undefined) {
    if (
      typeof payload.dashboardDensity !== "string" ||
      !ALLOWED_DENSITIES.includes(payload.dashboardDensity)
    ) {
      throw new Error(
        `dashboardDensity must be one of: ${ALLOWED_DENSITIES.join(", ")}.`
      );
    }

    data.dashboardDensity = payload.dashboardDensity;
  }

  if (payload.defaultForecastHorizon !== undefined) {
    const horizon = Number(payload.defaultForecastHorizon);

    if (
      !Number.isInteger(horizon) ||
      !ALLOWED_FORECAST_HORIZONS.includes(horizon)
    ) {
      throw new Error(
        `defaultForecastHorizon must be one of: ${ALLOWED_FORECAST_HORIZONS.join(
          ", "
        )}.`
      );
    }

    data.defaultForecastHorizon = horizon;
  }

  if (payload.defaultDateRange !== undefined) {
    if (
      typeof payload.defaultDateRange !== "string" ||
      !ALLOWED_DATE_RANGES.includes(payload.defaultDateRange)
    ) {
      throw new Error(
        `defaultDateRange must be one of: ${ALLOWED_DATE_RANGES.join(", ")}.`
      );
    }

    data.defaultDateRange = payload.defaultDateRange;
  }

  return data;
}

export async function getUserSettings(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  return prisma.userSettings.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      ...DEFAULT_SETTINGS,
    },
    update: {},
  });
}

export async function updateUserSettings(userId, payload) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const data = validateSettingsPayload(payload);

  return prisma.userSettings.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      ...DEFAULT_SETTINGS,
      ...data,
    },
    update: data,
  });
}