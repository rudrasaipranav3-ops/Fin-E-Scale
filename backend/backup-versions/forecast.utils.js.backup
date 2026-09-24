/**
 * Forecast utility helpers.
 *
 * Shared by:
 * - analytics.controller.js
 * - dashboard.controller.js
 */

/**
 * Calculate the quality of the historical data used
 * for sales forecasting.
 *
 * @param {Array} orders - Completed orders containing orderDate.
 * @returns {{
 *   quality: "high" | "medium" | "low" | "insufficient",
 *   observedDays: number,
 *   calendarDays: number,
 *   missingDays: number
 * }}
 */
export function calculateForecastDataQuality(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return {
      quality: "insufficient",
      observedDays: 0,
      calendarDays: 0,
      missingDays: 0,
      coverage: 0,
    };
  }

  const validDates = orders
    .map((order) => new Date(order.orderDate))
    .filter(
      (date) => !Number.isNaN(date.getTime())
    );

  if (validDates.length === 0) {
    return {
      quality: "insufficient",
      observedDays: 0,
      calendarDays: 0,
      missingDays: 0,
      coverage: 0,
    };
  }

  /*
   * Normalize dates to YYYY-MM-DD so multiple orders
   * occurring on the same calendar day count as one
   * observed day.
   */
  const uniqueDays = new Set(
    validDates.map((date) =>
      date.toISOString().slice(0, 10)
    )
  );

  const sortedDays = [...uniqueDays].sort();

  const observedDays = sortedDays.length;

  if (observedDays === 1) {
    return {
      quality: "insufficient",
      observedDays,
      calendarDays: 1,
      missingDays: 0,
      coverage: 1,
    };
  }

  const firstDate = new Date(
    `${sortedDays[0]}T00:00:00.000Z`
  );

  const lastDate = new Date(
    `${sortedDays[sortedDays.length - 1]}T00:00:00.000Z`
  );

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  const calendarDays =
    Math.floor(
      (
        lastDate.getTime() -
        firstDate.getTime()
      ) / millisecondsPerDay
    ) + 1;

  const missingDays = Math.max(
    0,
    calendarDays - observedDays
  );

  /*
   * Calculate the percentage of calendar days
   * for which actual observations exist.
   */
  const coverage =
    calendarDays > 0
      ? observedDays / calendarDays
      : 0;

  /*
   * Quality classification.
   *
   * High:
   *   >= 90% calendar coverage
   *
   * Medium:
   *   >= 70% calendar coverage
   *
   * Low:
   *   > 0% calendar coverage
   *
   * Insufficient:
   *   no usable history
   */
  let quality;

  if (coverage >= 0.9) {
    quality = "high";
  } else if (coverage >= 0.7) {
    quality = "medium";
  } else if (coverage > 0) {
    quality = "low";
  } else {
    quality = "insufficient";
  }
  return {
    quality,
    observedDays,
    calendarDays,
    missingDays,
    coverage: Number(coverage.toFixed(4)),
  };
}