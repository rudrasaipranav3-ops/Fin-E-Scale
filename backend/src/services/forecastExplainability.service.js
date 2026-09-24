function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function round(value, decimals = 2) {
  const multiplier = 10 ** decimals;

  return Math.round(
    toNumber(value) * multiplier
  ) / multiplier;
}

function formatCurrency(value) {
  return `₹${Math.round(
    toNumber(value)
  ).toLocaleString("en-IN")}`;
}

function formatPercent(value) {
  const number = toNumber(value);

  const sign = number > 0 ? "+" : "";

  return `${sign}${number.toFixed(2)}%`;
}

function getDateLabel(date) {
  if (!date) {
    return "unknown";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return String(date);
  }

  return parsed.toISOString().slice(0, 10);
}

function getWeekday(date) {
  if (!date) {
    return null;
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      timeZone: "UTC",
    }
  );
}

function calculateRevenuePosition(
  revenue,
  averageRevenue
) {
  if (!averageRevenue) {
    return {
      position: "unknown",
      deviationPercent: null,
    };
  }

  const deviationPercent =
    ((revenue - averageRevenue) /
      averageRevenue) *
    100;

  if (deviationPercent >= 10) {
    return {
      position: "high",
      deviationPercent: round(
        deviationPercent
      ),
    };
  }

  if (deviationPercent <= -10) {
    return {
      position: "low",
      deviationPercent: round(
        deviationPercent
      ),
    };
  }

  return {
    position: "normal",
    deviationPercent: round(
      deviationPercent
    ),
  };
}

function buildReasons({
  point,
  averageRevenue,
  averageOrders,
  averageAOV,
}) {
  const reasons = [];
const forecastDate =
  point.period ??
  point.forecastDate ??
  point.date ??
  point.forecast_date ??
  null;
  
  const revenue = toNumber(
    point.predictedRevenue
  );

  const orders = toNumber(
    point.predictedOrders ??
      point.expectedOrders
  );

  const aov = toNumber(
    point.predictedAOV
  );

  const revenuePosition =
    calculateRevenuePosition(
      revenue,
      averageRevenue
    );

  if (
    revenuePosition.position ===
    "high"
  ) {
    reasons.push({
      type: "revenue-above-average",
      message: `Predicted revenue is ${formatPercent(
        revenuePosition.deviationPercent
      )} above the forecast-period average.`,
      impact: "positive",
    });
  }

  if (
    revenuePosition.position ===
    "low"
  ) {
    reasons.push({
      type: "revenue-below-average",
      message: `Predicted revenue is ${formatPercent(
        revenuePosition.deviationPercent
      )} below the forecast-period average.`,
      impact: "negative",
    });
  }

  if (
    averageOrders > 0 &&
    orders > averageOrders * 1.1
  ) {
    reasons.push({
      type: "higher-demand",
      message: `Expected orders are ${formatPercent(
        ((orders - averageOrders) /
          averageOrders) *
          100
      )} above the forecast-period average.`,
      impact: "positive",
    });
  }

  if (
    averageOrders > 0 &&
    orders < averageOrders * 0.9
  ) {
    reasons.push({
      type: "lower-demand",
      message: `Expected orders are ${formatPercent(
        ((orders - averageOrders) /
          averageOrders) *
          100
      )} below the forecast-period average.`,
      impact: "negative",
    });
  }

  if (
    averageAOV > 0 &&
    aov > averageAOV * 1.1
  ) {
    reasons.push({
      type: "higher-aov",
      message: `Predicted AOV is ${formatPercent(
        ((aov - averageAOV) /
          averageAOV) *
          100
      )} above the forecast-period average.`,
      impact: "positive",
    });
  }

  if (
    averageAOV > 0 &&
    aov < averageAOV * 0.9
  ) {
    reasons.push({
      type: "lower-aov",
      message: `Predicted AOV is ${formatPercent(
        ((aov - averageAOV) /
          averageAOV) *
          100
      )} below the forecast-period average.`,
      impact: "negative",
    });
  }

  return reasons;
}

function buildBusinessImplication({
  position,
  orders,
  aov,
  averageOrders,
  averageAOV,
}) {
  if (position === "high") {
    if (
      averageOrders > 0 &&
      orders > averageOrders * 1.1
    ) {
      return "Prepare inventory and operational capacity for potentially stronger demand.";
    }

    if (
      averageAOV > 0 &&
      aov > averageAOV * 1.1
    ) {
      return "Consider maintaining premium-product availability and upselling capacity.";
    }

    return "Prepare inventory and promotional capacity for a potentially stronger revenue day.";
  }

  if (position === "low") {
    if (
      averageOrders > 0 &&
      orders < averageOrders * 0.9
    ) {
      return "Consider targeted promotions or customer-retention activity to support demand.";
    }

    if (
      averageAOV > 0 &&
      aov < averageAOV * 0.9
    ) {
      return "Consider bundles, upselling, and cross-selling to improve transaction value.";
    }

    return "Consider targeted promotions or retention activity around this lower-revenue day.";
  }

  return "Monitor the day alongside the overall forecast and adjust operations according to actual demand.";
}

function calculateForecastAverages(
  points
) {
  const validOrders = points
    .map((point) =>
      toNumber(
        point.predictedOrders ??
          point.expectedOrders,
        NaN
      )
    )
    .filter(Number.isFinite);

  const validAOV = points
    .map((point) =>
      toNumber(
        point.predictedAOV,
        NaN
      )
    )
    .filter(Number.isFinite);

  const validRevenue = points
    .map((point) =>
      toNumber(
        point.predictedRevenue,
        NaN
      )
    )
    .filter(Number.isFinite);

  return {
    averageRevenue:
      validRevenue.length > 0
        ? validRevenue.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / validRevenue.length
        : 0,

    averageOrders:
      validOrders.length > 0
        ? validOrders.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / validOrders.length
        : 0,

    averageAOV:
      validAOV.length > 0
        ? validAOV.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / validAOV.length
        : 0,
  };
}

export function explainForecastDay(
  point,
  context
) {
  const forecastDate =
    point.period ??
    point.forecastDate ??
    point.date ??
    point.forecast_date ??
    null;

  const revenue = toNumber(
    point.predictedRevenue
  );

  const orders = toNumber(
    point.predictedOrders ??
      point.expectedOrders
  );

  const aov = toNumber(
    point.predictedAOV
  );

  const revenuePosition =
    calculateRevenuePosition(
      revenue,
      context.averageRevenue
    );

  const reasons = buildReasons({
    point,
    averageRevenue:
      context.averageRevenue,
    averageOrders:
      context.averageOrders,
    averageAOV:
      context.averageAOV,
  });

  const businessImplication =
    buildBusinessImplication({
      position:
        revenuePosition.position,
      orders,
      aov,
      averageOrders:
        context.averageOrders,
      averageAOV:
        context.averageAOV,
    });

  return {
    date: getDateLabel(
  forecastDate
),

weekday: getWeekday(
  forecastDate
),

    predictedRevenue:
      round(revenue),

    expectedOrders:
      round(orders),

    predictedAOV:
      round(aov),

    revenuePosition:
      revenuePosition.position,

    deviationFromAveragePercent:
      revenuePosition.deviationPercent,

    reasons,

    businessImplication,
  };
}

export function generateForecastExplainability(
  points
) {
  if (
    !Array.isArray(points) ||
    points.length === 0
  ) {
    return [];
  }

  const averages =
    calculateForecastAverages(
      points
    );

  return points.map((point) =>
    explainForecastDay(
      point,
      averages
    )
  );
}