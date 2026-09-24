"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Info,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import type { ForecastExplanation } from "@/types/forecast";

interface ForecastExplainabilityProps {
  explanations: ForecastExplanation[] | null | undefined;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function getPositionStyles(position?: string | null) {
  switch (position) {
    case "high":
      return {
        badge:
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        icon: TrendingUp,
      };

    case "low":
      return {
        badge:
          "border-rose-400/20 bg-rose-400/10 text-rose-300",
        icon: TrendingDown,
      };

    default:
      return {
        badge:
          "border-amber-400/20 bg-amber-400/10 text-amber-300",
        icon: Info,
      };
  }
}

function getImpactStyles(impact?: string | null) {
  switch (impact) {
    case "positive":
      return {
        icon: CircleCheck,
        className: "text-emerald-300",
      };

    case "negative":
      return {
        icon: CircleAlert,
        className: "text-rose-300",
      };

    default:
      return {
        icon: Info,
        className: "text-amber-300",
      };
  }
}

export default function ForecastExplainability({
  explanations,
}: ForecastExplainabilityProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const INITIAL_VISIBLE_DAYS = 7;

  const validExplanations = useMemo(
    () =>
      (explanations ?? []).filter(
        (item) =>
          item &&
          typeof item.date === "string" &&
          item.date.length > 0
      ),
    [explanations]
  );

  if (!validExplanations.length) {
    return null;
  }

  const visibleExplanations = showAll
    ? validExplanations
    : validExplanations.slice(0, INITIAL_VISIBLE_DAYS);

  const hiddenCount = Math.max(
    validExplanations.length - INITIAL_VISIBLE_DAYS,
    0
  );

  const selectedExplanation =
    validExplanations.find(
      (item) => item.date === selectedDate
    ) ?? null;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d1020]/90 p-5 shadow-xl">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />

            <span className="text-xs font-medium uppercase tracking-[0.16em] text-violet-300">
              AI Explainability
            </span>
          </div>

          <h2 className="text-lg font-semibold text-white">
            Why is each forecast day different?
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Select a forecast day to understand the revenue drivers,
            demand pattern, and recommended business response.
          </p>
        </div>

        <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200">
          {validExplanations.length} forecast days
        </div>
      </div>

      {/* Day selector */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {visibleExplanations.map((day) => {
          const isSelected = day.date === selectedDate;
          const positionStyles = getPositionStyles(
            day.revenuePosition
          );
          const PositionIcon = positionStyles.icon;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() =>
                setSelectedDate(
                  isSelected ? null : day.date
                )
              }
              className={[
                "group rounded-xl border p-3 text-left transition-all",
                isSelected
                  ? "border-violet-400/40 bg-violet-400/10 shadow-lg shadow-violet-950/30"
                  : "border-white/10 bg-white/[0.025] hover:border-violet-400/25 hover:bg-white/[0.05]",
              ].join(" ")}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />

                  <span className="text-xs font-medium text-slate-300">
                    {day.weekday ?? "Forecast"}
                  </span>
                </div>

                {isSelected ? (
                  <ChevronUp className="h-4 w-4 text-violet-300" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                )}
              </div>

              <p className="text-sm font-semibold text-white">
                {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </p>

              <p className="mt-2 text-lg font-semibold text-white">
                {formatCurrency(day.predictedRevenue)}
              </p>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium uppercase ${positionStyles.badge}`}
                >
                  <PositionIcon className="h-3 w-3" />
                  {day.revenuePosition ?? "normal"}
                </span>

                <span className="text-[10px] text-slate-500">
                  {day.deviationFromAveragePercent != null
                    ? `${
                        day.deviationFromAveragePercent >= 0
                          ? "+"
                          : ""
                      }${day.deviationFromAveragePercent.toFixed(
                        1
                      )}%`
                    : "—"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-4 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-400/35 hover:bg-violet-400/[0.1]"
          >
            {showAll ? (
              <>
                Show fewer days
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show {hiddenCount} more days
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Selected explanation */}
      {selectedExplanation && (
        <div className="mt-5 overflow-hidden rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] to-transparent">
          <div className="border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-violet-300" />

                  <span className="text-sm font-medium text-violet-200">
                    {selectedExplanation.weekday}
                  </span>
                </div>

                <h3 className="mt-1 text-xl font-semibold text-white">
                  {new Date(
                    `${selectedExplanation.date}T00:00:00`
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
              </div>

              <div
                className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase ${getPositionStyles(
                  selectedExplanation.revenuePosition
                ).badge}`}
              >
                {selectedExplanation.revenuePosition ??
                  "normal"}{" "}
                forecast day
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid gap-px border-b border-white/10 bg-white/10 sm:grid-cols-3">
            <div className="bg-[#0d1020] p-4">
              <p className="text-xs text-slate-500">
                Predicted Revenue
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {formatCurrency(
                  selectedExplanation.predictedRevenue
                )}
              </p>
            </div>

            <div className="bg-[#0d1020] p-4">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5 text-slate-500" />

                <p className="text-xs text-slate-500">
                  Expected Orders
                </p>
              </div>

              <p className="mt-1 text-xl font-semibold text-white">
                {formatNumber(
                  selectedExplanation.expectedOrders
                )}
              </p>
            </div>

            <div className="bg-[#0d1020] p-4">
              <p className="text-xs text-slate-500">
                Predicted AOV
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {formatCurrency(
                  selectedExplanation.predictedAOV
                )}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">
                Why this day is{" "}
                {selectedExplanation.revenuePosition === "high"
                  ? "strong"
                  : selectedExplanation.revenuePosition === "low"
                    ? "weaker"
                    : "different"}
                ?
              </h4>

              <div className="space-y-3">
                {(selectedExplanation.reasons ?? []).map(
                  (reason, index) => {
                    const impactStyles = getImpactStyles(
                      reason.impact
                    );

                    const ImpactIcon = impactStyles.icon;

                    return (
                      <div
                        key={`${reason.type}-${index}`}
                        className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3"
                      >
                        <ImpactIcon
                          className={`mt-0.5 h-4 w-4 shrink-0 ${impactStyles.className}`}
                        />

                        <div>
                          <p className="text-sm leading-5 text-slate-300">
                            {reason.message}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {selectedExplanation.deviationFromAveragePercent !=
                null && (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                  <p className="text-xs text-slate-500">
                    Revenue deviation from forecast average
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {selectedExplanation.deviationFromAveragePercent >=
                    0
                      ? "+"
                      : ""}
                    {selectedExplanation.deviationFromAveragePercent.toFixed(
                      2
                    )}
                    %
                  </p>
                </div>
              )}
            </div>

            {/* Business implication */}
            <div className="rounded-xl border border-violet-400/20 bg-violet-400/[0.06] p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-300" />

                <h4 className="text-sm font-semibold text-white">
                  Business implication
                </h4>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                {selectedExplanation.businessImplication ??
                  "Use the forecast as an input for operational planning and business decisions."}
              </p>
            </div>
          </div>
        </div>
      )}

      {!selectedExplanation && (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
          <p className="text-sm text-slate-400">
            Select a forecast day above to see why its predicted
            revenue is high, low, or normal.
          </p>
        </div>
      )}
    </section>
  );
}