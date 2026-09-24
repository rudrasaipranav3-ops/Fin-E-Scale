/**
 * Format a numeric value as Indian Rupees.
 */
export function formatCurrency(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a percentage value.
 *
 * Positive values receive a "+" prefix.
 */
export function formatPercent(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (!Number.isFinite(value)) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format an ISO date string.
 */
export function formatDate(
  value: string | null | undefined
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Format a short date.
 *
 * Example:
 * 2026-08-30 → 30 Aug
 */
export function formatShortDate(
  value: string | null | undefined
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

/**
 * Get a visual trend symbol.
 */
export function getTrendSymbol(
  direction: string | null | undefined
): string {
  switch (direction) {
    case "increasing":
      return "↑";

    case "decreasing":
      return "↓";

    case "stable":
      return "→";

    default:
      return "—";
  }
}

/**
 * Get a human-readable trend label.
 */
export function getTrendLabel(
  direction: string | null | undefined
): string {
  switch (direction) {
    case "increasing":
      return "Increasing";

    case "decreasing":
      return "Decreasing";

    case "stable":
      return "Stable";

    case "insufficient-data":
      return "Insufficient data";

    default:
      return "Unknown";
  }
}

/**
 * Return a CSS class for a trend direction.
 *
 * These classes assume Tailwind CSS is being used.
 */
export function getTrendTextClass(
  direction: string | null | undefined
): string {
  switch (direction) {
    case "increasing":
      return "text-emerald-600";

    case "decreasing":
      return "text-red-600";

    case "stable":
      return "text-amber-600";

    default:
      return "text-gray-500";
  }
}

/**
 * Return a CSS class for recommendation priority.
 */
export function getPriorityClass(
  priority: string | null | undefined
): string {
  switch (priority) {
    case "high":
      return "border-red-200 bg-red-50 text-red-700";

    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "low":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

/**
 * Return a CSS class for risk level.
 */
export function getRiskClass(
  level: string | null | undefined
): string {
  switch (level) {
    case "high":
      return "border-red-200 bg-red-50 text-red-700";

    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "low":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

/**
 * Return a readable model name.
 */
export function getModelDisplayName(
  model: string | null | undefined
): string {
  switch (model) {
    case "baseline":
      return "Baseline";

    case "v4":
      return "V4";

    case "v4_1":
      return "V4.1";

    default:
      return model || "Unknown";
  }
}