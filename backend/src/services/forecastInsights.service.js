/**
 * AI Business Insights Service
 *
 * Converts the validated V4.1 sales forecast into
 * business-oriented metrics, risks, opportunities,
 * and actionable recommendations.
 *
 * IMPORTANT:
 * - This service does NOT modify the V4.1 forecasting model.
 * - It only interprets the forecast and observed historical data.
 * - Historical trend calculations use genuinely observed days.
 */

/**
 * Safely convert a value to a number.
 */
function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/**
 * Calculate percentage change.
 */
function calculatePercentageChange(current, previous) {
  if (!previous || previous === 0) {
    return null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Determine trend direction.
 *
 * +/-5% is treated as the stable range.
 */
function getTrendDirection(changePercent, threshold = 5) {
  if (changePercent === null || changePercent === undefined) {
    return "insufficient-data";
  }

  if (changePercent > threshold) {
    return "increasing";
  }

  if (changePercent < -threshold) {
    return "decreasing";
  }

  return "stable";
}

/**
 * Determine recommendation priority from adverse change.
 *
 * >20%  -> high
 * 10-20% -> medium
 * 5-10%  -> low
 * <5% -> low/stable
 */
function getAdverseChangePriority(changePercent) {
  if (changePercent === null || changePercent === undefined) {
    return "low";
  }

  const magnitude = Math.abs(changePercent);

  if (magnitude > 20) {
    return "high";
  }

  if (magnitude >= 10) {
    return "medium";
  }

  return "low";
}

/**
 * Get recent genuinely observed historical days.
 *
 * IMPORTANT:
 * The history contains zero-filled calendar days where
 * observed === false. Those must NOT be treated as actual
 * business performance.
 */
function getRecentHistoricalWindow(
  historicalPoints = [],
  days = 7
) {
  if (!Array.isArray(historicalPoints)) {
    return [];
  }

  return historicalPoints
    .filter((point) => {
      if (!point) {
        return false;
      }

      // Preferred: explicit observed flag.
      if (point.observed !== undefined) {
        return point.observed === true;
      }

      // Backward-compatible fallback.
      return (
        toNumber(point.revenue, 0) > 0 ||
        toNumber(point.orders, 0) > 0
      );
    })
    .slice(-days);
}

/**
 * Calculate revenue outlook from V4.1 forecast points.
 */
function calculateRevenueOutlook(forecastPoints) {
  if (!Array.isArray(forecastPoints) || forecastPoints.length === 0) {
    return {
      next7Days: 0,
      next30Days: 0,
      averageDailyRevenue: 0,
      peakDay: null,
      lowestDay: null,
    };
  }

  const points = forecastPoints
    .map((point) => ({
      date: point.date ?? point.period,
      predictedRevenue: toNumber(point.predictedRevenue),
      expectedOrders:
        point.expectedOrders !== undefined &&
        point.expectedOrders !== null
          ? toNumber(point.expectedOrders)
          : null,
      predictedOrders:
        point.predictedOrders !== undefined &&
        point.predictedOrders !== null
          ? toNumber(point.predictedOrders)
          : null,
      predictedAOV:
        point.predictedAOV !== undefined &&
        point.predictedAOV !== null
          ? toNumber(point.predictedAOV)
          : null,
    }))
    .filter((point) => point.date);

  const next7 = points.slice(0, 7);
  const next30 = points.slice(0, 30);

  const next7Revenue = next7.reduce(
    (total, point) => total + point.predictedRevenue,
    0
  );

  const next30Revenue = next30.reduce(
    (total, point) => total + point.predictedRevenue,
    0
  );

  const averageDailyRevenue =
    next30.length > 0
      ? next30Revenue / next30.length
      : 0;

  const peakPoint = points.reduce((highest, point) => {
    if (
      !highest ||
      point.predictedRevenue > highest.predictedRevenue
    ) {
      return point;
    }

    return highest;
  }, null);

  const lowestPoint = points.reduce((lowest, point) => {
    if (
      !lowest ||
      point.predictedRevenue < lowest.predictedRevenue
    ) {
      return point;
    }

    return lowest;
  }, null);

  return {
    next7Days: Number(next7Revenue.toFixed(2)),

    next30Days: Number(next30Revenue.toFixed(2)),

    averageDailyRevenue: Number(
      averageDailyRevenue.toFixed(2)
    ),

    peakDay: peakPoint
      ? {
          date: peakPoint.date,
          predictedRevenue: Number(
            peakPoint.predictedRevenue.toFixed(2)
          ),
        }
      : null,

    lowestDay: lowestPoint
      ? {
          date: lowestPoint.date,
          predictedRevenue: Number(
            lowestPoint.predictedRevenue.toFixed(2)
          ),
        }
      : null,
  };
}

/**
 * Calculate demand trend.
 *
 * Compares:
 *
 *   Recent 7 observed historical days
 *                    vs
 *   Next 7 forecast days
 *
 * This is intentionally NOT forecast-week-1 vs forecast-week-2.
 */
function calculateDemandTrend(
  forecastPoints,
  historicalPoints = []
) {
  if (
    !Array.isArray(forecastPoints) ||
    forecastPoints.length === 0
  ) {
    return {
      direction: "insufficient-data",
      changePercent: null,
      recentOrders: 0,
      projectedOrders: 0,
    };
  }

  const recentHistory =
    getRecentHistoricalWindow(
      historicalPoints,
      7
    );

  const next7 =
    forecastPoints.slice(0, 7);

  if (
    recentHistory.length === 0 ||
    next7.length === 0
  ) {
    return {
      direction: "insufficient-data",
      changePercent: null,
      recentOrders: 0,
      projectedOrders: 0,
    };
  }

  const historicalOrders =
    recentHistory.reduce(
      (total, point) =>
        total + toNumber(point.orders),
      0
    );

  const getForecastOrders = (point) => {
    if (
      point.expectedOrders !== undefined &&
      point.expectedOrders !== null
    ) {
      return toNumber(point.expectedOrders);
    }

    return toNumber(point.predictedOrders);
  };

  const projectedOrders =
    next7.reduce(
      (total, point) =>
        total + getForecastOrders(point),
      0
    );

  const changePercent =
    calculatePercentageChange(
      projectedOrders,
      historicalOrders
    );

  return {
    direction:
      getTrendDirection(changePercent),

    changePercent:
      changePercent === null
        ? null
        : Number(changePercent.toFixed(2)),

    recentOrders:
      Number(historicalOrders.toFixed(2)),

    projectedOrders:
      Number(projectedOrders.toFixed(2)),
  };
}

/**
 * Calculate AOV trend.
 *
 * Uses aggregate revenue / aggregate orders rather
 * than averaging daily AOV values.
 *
 * This avoids distortion from zero-order days.
 */
function calculateAOVTrend(
  forecastPoints,
  historicalPoints = []
) {
  if (
    !Array.isArray(forecastPoints) ||
    forecastPoints.length === 0
  ) {
    return {
      direction: "insufficient-data",
      changePercent: null,
      recentAOV: null,
      projectedAOV: null,
    };
  }

  const recentHistory =
    getRecentHistoricalWindow(
      historicalPoints,
      7
    );

  const next7 =
    forecastPoints.slice(0, 7);

  if (
    recentHistory.length === 0 ||
    next7.length === 0
  ) {
    return {
      direction: "insufficient-data",
      changePercent: null,
      recentAOV: null,
      projectedAOV: null,
    };
  }

  const historicalRevenue =
    recentHistory.reduce(
      (total, point) =>
        total + toNumber(point.revenue),
      0
    );

  const historicalOrders =
    recentHistory.reduce(
      (total, point) =>
        total + toNumber(point.orders),
      0
    );

  if (historicalOrders <= 0) {
    return {
      direction: "insufficient-data",
      changePercent: null,
      recentAOV: null,
      projectedAOV: null,
    };
  }

  const projectedRevenue =
    next7.reduce(
      (total, point) =>
        total + toNumber(point.predictedRevenue),
      0
    );

  const projectedOrders =
    next7.reduce((total, point) => {
      if (
        point.expectedOrders !== undefined &&
        point.expectedOrders !== null
      ) {
        return (
          total +
          toNumber(point.expectedOrders)
        );
      }

      return (
        total +
        toNumber(point.predictedOrders)
      );
    }, 0);

  if (projectedOrders <= 0) {
    return {
      direction: "insufficient-data",
      changePercent: null,
      recentAOV: Number(
        (historicalRevenue / historicalOrders).toFixed(2)
      ),
      projectedAOV: null,
    };
  }

  const recentAOV =
    historicalRevenue / historicalOrders;

  const projectedAOV =
    projectedRevenue / projectedOrders;

  const changePercent =
    calculatePercentageChange(
      projectedAOV,
      recentAOV
    );

  return {
    direction:
      getTrendDirection(changePercent),

    changePercent:
      changePercent === null
        ? null
        : Number(changePercent.toFixed(2)),

    recentAOV:
      Number(recentAOV.toFixed(2)),

    projectedAOV:
      Number(projectedAOV.toFixed(2)),
  };
}

/**
 * Calculate revenue trend.
 *
 * Compares recent observed 7-day revenue
 * with next 7-day V4.1 forecast revenue.
 */
function calculateRevenueTrend(
  forecastPoints,
  historicalPoints = []
) {
  if (
    !Array.isArray(forecastPoints) ||
    forecastPoints.length === 0
  ) {
    return {
      direction: "insufficient-data",
      changePercent: null,
      recentRevenue: 0,
      projectedRevenue: 0,
    };
  }

  const recentHistory =
    getRecentHistoricalWindow(
      historicalPoints,
      7
    );

  const next7 =
    forecastPoints.slice(0, 7);

  if (
    recentHistory.length === 0 ||
    next7.length === 0
  ) {
    return {
      direction: "insufficient-data",
      changePercent: null,
      recentRevenue: 0,
      projectedRevenue: 0,
    };
  }

  const recentRevenue =
    recentHistory.reduce(
      (total, point) =>
        total + toNumber(point.revenue),
      0
    );

  const projectedRevenue =
    next7.reduce(
      (total, point) =>
        total + toNumber(point.predictedRevenue),
      0
    );

  const changePercent =
    calculatePercentageChange(
      projectedRevenue,
      recentRevenue
    );

  return {
    direction:
      getTrendDirection(changePercent),

    changePercent:
      changePercent === null
        ? null
        : Number(changePercent.toFixed(2)),

    recentRevenue:
      Number(recentRevenue.toFixed(2)),

    projectedRevenue:
      Number(projectedRevenue.toFixed(2)),
  };
}

/**
 * Detect unusually high forecast days.
 *
 * A peak day is defined as a forecast day whose revenue
 * is at least 25% above the average forecast revenue.
 */
function detectPeakDays(forecastPoints) {
  if (
    !Array.isArray(forecastPoints) ||
    forecastPoints.length === 0
  ) {
    return [];
  }

  const revenues =
    forecastPoints.map((point) =>
      toNumber(point.predictedRevenue)
    );

  const averageRevenue =
    revenues.reduce(
      (sum, revenue) =>
        sum + revenue,
      0
    ) / revenues.length;

  if (averageRevenue <= 0) {
    return [];
  }

  const threshold =
    averageRevenue * 1.25;

  return forecastPoints
    .filter(
      (point) =>
        toNumber(point.predictedRevenue) >=
        threshold
    )
    .map((point) => ({
      date:
        point.date ??
        point.period,

      predictedRevenue:
        Number(
          toNumber(
            point.predictedRevenue
          ).toFixed(2)
        ),

      deviationFromAveragePercent:
        Number(
          (
            (
              (
                toNumber(
                  point.predictedRevenue
                ) -
                averageRevenue
              ) /
              averageRevenue
            ) *
            100
          ).toFixed(2)
        ),
    }))
    .sort(
      (a, b) =>
        b.predictedRevenue -
        a.predictedRevenue
    );
}

/**
 * Generate risk indicators.
 */
function generateRiskIndicators({
  forecastPoints,
  modelDiagnostics,
  dataQuality,
}) {
  const risks = [];

  const points =
    Array.isArray(forecastPoints)
      ? forecastPoints
      : [];

  if (points.length === 0) {
    risks.push({
      level: "high",
      type: "insufficient-forecast",
      title: "Insufficient Forecast Data",
      message:
        "No forecast points are available for business analysis.",
    });

    return risks;
  }

  const revenues =
    points.map((point) =>
      toNumber(point.predictedRevenue)
    );

  const averageRevenue =
    revenues.reduce(
      (sum, revenue) =>
        sum + revenue,
      0
    ) / revenues.length;

  const maxRevenue =
    Math.max(...revenues);

  const minRevenue =
    Math.min(...revenues);

  if (averageRevenue > 0) {
    const volatilityRatio =
      (
        maxRevenue -
        minRevenue
      ) / averageRevenue;

    if (volatilityRatio >= 1.5) {
      risks.push({
        level: "medium",
        type: "revenue-volatility",
        title: "Revenue Volatility",
        message:
          "Forecast revenue shows significant variation across the forecast period.",
      });
    }
  }

  if (dataQuality) {
    const coverage =
      toNumber(
        dataQuality.coverage,
        1
      );

    if (coverage < 0.8) {
      risks.push({
        level: "medium",
        type: "data-coverage",
        title: "Limited Data Coverage",
        message:
          "Historical data coverage is limited. Forecast-based decisions should be made cautiously.",
      });
    }
  }

  if (modelDiagnostics) {
    const spikeDays =
      toNumber(
        modelDiagnostics.spikeDays ??
          modelDiagnostics.spikeCountRecent,
        0
      );

    if (spikeDays > 0) {
      risks.push({
        level: "low",
        type: "historical-spikes",
        title: "Historical Revenue Spikes",
        message:
          "Recent historical data contains revenue spikes that may increase forecast uncertainty.",
      });
    }
  }

  return risks;
}

/**
 * Find the lowest forecast-revenue days.
 *
 * Used by recommendations to provide concrete dates.
 */
function getLowestForecastDays(
  forecastPoints,
  count = 2
) {
  if (
    !Array.isArray(forecastPoints) ||
    forecastPoints.length === 0
  ) {
    return [];
  }

  return [...forecastPoints]
    .slice(0, 7)
    .sort(
      (a, b) =>
        toNumber(a.predictedRevenue) -
        toNumber(b.predictedRevenue)
    )
    .slice(0, count)
    .map((point) => ({
      date:
        point.date ??
        point.period,

      predictedRevenue:
        Number(
          toNumber(
            point.predictedRevenue
          ).toFixed(2)
        ),
    }));
}

/**
 * Generate specific business recommendations.
 *
 * Recommendations are based on actual calculated
 * forecast-vs-history metrics.
 */
function generateRecommendations({
  revenueOutlook,
  demandTrend,
  aovTrend,
  revenueTrend,
  peakDays,
  forecastPoints = [],
  risks = [],
}) {
  const recommendations = [];

  /*
   * =========================================================
   * REVENUE RISK
   * =========================================================
   */

  if (
    revenueTrend &&
    revenueTrend.direction === "decreasing" &&
    revenueTrend.changePercent !== null
  ) {
    const change =
      revenueTrend.changePercent;

    const priority =
      getAdverseChangePriority(change);

    const lowestDays =
      getLowestForecastDays(
        forecastPoints,
        2
      );

    const datesText =
      lowestDays.length > 0
        ? ` Prioritize attention around ${lowestDays
            .map(
              (day) =>
                `${day.date} (₹${day.predictedRevenue.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 0,
                  }
                )})`
            )
            .join(" and ")}.`
        : "";

    recommendations.push({
      priority,
      category: "revenue-risk",
      title: "Revenue Decline Risk",
      metric: "revenue",
      changePercent:
        Number(change.toFixed(2)),
      recommendation:
        `Forecast revenue is ${Math.abs(
          change
        ).toFixed(
          2
        )}% below recent observed revenue. Review demand-generation and conversion strategies before the forecast period.${datesText}`,
      supportingDates:
        lowestDays.map(
          (day) => day.date
        ),
    });
  }

  /*
   * =========================================================
   * REVENUE OPPORTUNITY
   * =========================================================
   */

  if (
    revenueTrend &&
    revenueTrend.direction === "increasing" &&
    revenueTrend.changePercent !== null
  ) {
    const change =
      revenueTrend.changePercent;

    const peakDate =
      revenueOutlook?.peakDay?.date;

    const peakRevenue =
      revenueOutlook?.peakDay
        ?.predictedRevenue;

    const peakText =
      peakDate && peakRevenue
        ? ` The highest forecast day is ${peakDate}, with predicted revenue of ₹${peakRevenue.toLocaleString(
            "en-IN",
            {
              maximumFractionDigits: 0,
            }
          )}.`
        : "";

    recommendations.push({
      priority:
        change > 20
          ? "high"
          : "medium",

      category:
        "revenue-opportunity",

      title:
        "Revenue Growth Opportunity",

      metric:
        "revenue",

      changePercent:
        Number(change.toFixed(2)),

      recommendation:
        `Forecast revenue is ${change.toFixed(
          2
        )}% above recent observed revenue. Prepare inventory, staffing, and operational capacity to capitalize on the expected growth.${peakText}`,

      supportingDates:
        peakDate
          ? [peakDate]
          : [],
    });
  }

  /*
   * =========================================================
   * DEMAND RISK
   * =========================================================
   */

  if (
    demandTrend &&
    demandTrend.direction === "decreasing" &&
    demandTrend.changePercent !== null
  ) {
    const change =
      demandTrend.changePercent;

    const lowestDays =
      getLowestForecastDays(
        forecastPoints,
        2
      );

    recommendations.push({
      priority:
        getAdverseChangePriority(
          change
        ),

      category:
        "demand-risk",

      title:
        "Demand Decline Risk",

      metric:
        "orders",

      changePercent:
        Number(change.toFixed(2)),

      recommendation:
        `Forecast order volume is ${Math.abs(
          change
        ).toFixed(
          2
        )}% below recent observed demand. Consider targeted promotional and customer-retention campaigns, especially around ${lowestDays
          .map(
            (day) =>
              day.date
          )
          .join(
            " and "
          ) || "the lowest-demand forecast days"}.`,

      supportingDates:
        lowestDays.map(
          (day) =>
            day.date
        ),
    });
  }

  /*
   * =========================================================
   * DEMAND OPPORTUNITY
   * =========================================================
   */

  if (
    demandTrend &&
    demandTrend.direction === "increasing" &&
    demandTrend.changePercent !== null
  ) {
    const change =
      demandTrend.changePercent;

    recommendations.push({
      priority:
        change > 20
          ? "high"
          : "medium",

      category:
        "demand-opportunity",

      title:
        "Demand Growth Opportunity",

      metric:
        "orders",

      changePercent:
        Number(change.toFixed(2)),

      recommendation:
        `Forecast order volume is ${change.toFixed(
          2
        )}% above recent observed demand. Increase inventory readiness, staffing capacity, and operational preparation for the expected increase in demand.`,

      supportingDates: [],
    });
  }

  /*
   * =========================================================
   * AOV RISK
   * =========================================================
   */

  if (
    aovTrend &&
    aovTrend.direction === "decreasing" &&
    aovTrend.changePercent !== null
  ) {
    const change =
      aovTrend.changePercent;

    recommendations.push({
      priority:
        getAdverseChangePriority(
          change
        ),

      category:
        "aov-risk",

      title:
        "Average Order Value Risk",

      metric:
        "aov",

      changePercent:
        Number(change.toFixed(2)),

      recommendation:
        `Forecast average order value is ${Math.abs(
          change
        ).toFixed(
          2
        )}% below the recent observed AOV. Consider bundles, upselling, cross-selling, and premium-product recommendations to increase transaction value.`,

      supportingDates: [],
    });
  }

  /*
   * =========================================================
   * AOV OPPORTUNITY
   * =========================================================
   */

  if (
    aovTrend &&
    aovTrend.direction === "increasing" &&
    aovTrend.changePercent !== null
  ) {
    const change =
      aovTrend.changePercent;

    recommendations.push({
      priority:
        change > 20
          ? "high"
          : "medium",

      category:
        "aov-opportunity",

      title:
        "Average Order Value Opportunity",

      metric:
        "aov",

      changePercent:
        Number(change.toFixed(2)),

      recommendation:
        `Forecast average order value is ${change.toFixed(
          2
        )}% above recent observed AOV. Prioritize premium products, bundles, and higher-value customer segments to capitalize on the expected increase.`,

      supportingDates: [],
    });
  }

  /*
   * =========================================================
   * PEAK-DAY OPPORTUNITY
   * =========================================================
   */

  if (
    Array.isArray(peakDays) &&
    peakDays.length > 0
  ) {
    const topPeak =
      peakDays[0];

    recommendations.push({
      priority: "high",

      category:
        "peak-demand",

      title:
        "Forecast Peak-Day Opportunity",

      metric:
        "predictedRevenue",

      changePercent:
        topPeak.deviationFromAveragePercent,

      recommendation:
        `Prepare additional inventory, staffing, and marketing support for ${topPeak.date}, which has forecast revenue of ₹${topPeak.predictedRevenue.toLocaleString(
          "en-IN",
          {
            maximumFractionDigits: 0,
          }
        )}, approximately ${Math.abs(
          topPeak.deviationFromAveragePercent
        ).toFixed(
          2
        )}% above the forecast-period average.`,

      supportingDates:
        peakDays
          .slice(0, 3)
          .map(
            (day) =>
              day.date
          ),
    });
  }

  /*
   * =========================================================
   * HIGH-RISK DATA CONDITION
   * =========================================================
   */

  const highRiskExists =
    risks.some(
      (risk) =>
        risk.level === "high"
    );

  if (highRiskExists) {
    recommendations.push({
      priority: "high",

      category:
        "forecast-risk",

      title:
        "Forecast Reliability Risk",

      recommendation:
        "Use conservative planning because the current forecast contains a high-risk data or forecast-quality condition. Validate major business decisions against additional observed sales information.",

      supportingDates: [],
    });
  }

  /*
   * =========================================================
   * PLANNING RECOMMENDATION
   * =========================================================
   */

  if (
    revenueOutlook &&
    revenueOutlook.next7Days > 0 &&
    revenueOutlook.next30Days > 0
  ) {
    recommendations.push({
      priority: "low",

      category:
        "planning",

      title:
        "Forecast-Based Planning",

      recommendation:
        "Use the 7-day revenue outlook for short-term operational planning and the 30-day outlook for broader business planning.",

      supportingDates: [],
    });
  }

  /*
   * =========================================================
   * SORT RECOMMENDATIONS BY PRIORITY
   * =========================================================
   */

  const priorityRank = {
    high: 3,
    medium: 2,
    low: 1,
  };

  recommendations.sort(
    (a, b) =>
      (priorityRank[b.priority] ?? 0) -
      (priorityRank[a.priority] ?? 0)
  );

  return recommendations;
}

/**
 * Main business insight generator.
 */
function generateForecastInsights({
  forecastPoints = [],
  historicalPoints = [],
  modelDiagnostics = null,
  dataQuality = null,
}) {
  const revenueOutlook =
    calculateRevenueOutlook(
      forecastPoints
    );

  const demandTrend =
    calculateDemandTrend(
      forecastPoints,
      historicalPoints
    );

  const aovTrend =
    calculateAOVTrend(
      forecastPoints,
      historicalPoints
    );

  const revenueTrend =
    calculateRevenueTrend(
      forecastPoints,
      historicalPoints
    );

  const peakDays =
    detectPeakDays(
      forecastPoints
    );

  const riskAlerts =
    generateRiskIndicators({
      forecastPoints,
      modelDiagnostics,
      dataQuality,
    });

  const recommendations =
    generateRecommendations({
      revenueOutlook,
      demandTrend,
      aovTrend,
      revenueTrend,
      peakDays,
      forecastPoints,
      risks: riskAlerts,
    });

  return {
    generatedAt:
      new Date().toISOString(),

    revenueOutlook,

    demandTrend,

    aovTrend,

    revenueTrend,

    peakDays,

    riskAlerts,

    recommendations,
  };
}

export {
  generateForecastInsights,
  calculateRevenueOutlook,
  calculateDemandTrend,
  calculateAOVTrend,
  calculateRevenueTrend,
  detectPeakDays,
  generateRiskIndicators,
  generateRecommendations,
  getRecentHistoricalWindow,
};