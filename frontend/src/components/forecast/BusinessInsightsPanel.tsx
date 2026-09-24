"use client";

import {
  CalendarDays,
  DollarSign,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import type {
  BusinessInsights,
  ForecastTrend,
} from "@/types/forecast";

import {
  formatCurrency,
  formatPercent,
  formatShortDate,
  getTrendLabel,
  getTrendSymbol,
  getTrendTextClass,
} from "@/utils/forecast";

interface BusinessInsightsPanelProps {
  insights:
    | BusinessInsights
    | null
    | undefined;
}

function TrendSummary({
  title,
  trend,
  icon,
  recentLabel,
  projectedLabel,
  formatValue,
  recentValue,
  projectedValue,
}: {
  title: string;
  trend: ForecastTrend | null | undefined;
  icon: React.ReactNode;
  recentLabel: string;
  projectedLabel: string;
  formatValue: (
    value: number | null | undefined
  ) => string;
  recentValue: number | null | undefined;
  projectedValue: number | null | undefined;
}) {
  const direction =
    trend?.direction ?? "insufficient-data";

  const changePercent =
    trend?.changePercent ?? null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-white/10 bg-[#090d1d] p-2 text-gray-400 shadow-sm">
            {icon}
          </div>

          <p className="text-sm font-semibold text-gray-200">
            {title}
          </p>
        </div>

        <span
          className={`text-xl font-bold ${getTrendTextClass(
            direction
          )}`}
        >
          {getTrendSymbol(direction)}
        </span>
      </div>

      <div className="mt-4">
        <p
          className={`text-lg font-bold ${getTrendTextClass(
            direction
          )}`}
        >
          {formatPercent(changePercent)}
        </p>

        <p
          className={`mt-0.5 text-xs font-medium ${getTrendTextClass(
            direction
          )}`}
        >
          {getTrendLabel(direction)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
        <div>
          <p className="text-xs text-gray-400">
            {recentLabel}
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-100">
            {formatValue(recentValue)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">
            {projectedLabel}
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-100">
            {formatValue(projectedValue)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BusinessInsightsPanel({
  insights,
}: BusinessInsightsPanelProps) {
  if (!insights) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-gray-100">
          AI Business Insights
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          Business insights are not available yet.
        </p>
      </section>
    );
  }

  const outlook =
    insights.revenueOutlook;

  const peakDay = outlook?.peakDay;
  const lowestDay = outlook?.lowestDay;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-300">
              <TrendingUp className="h-5 w-5" />
            </div>

            <h2 className="text-lg font-semibold text-gray-100">
              AI Business Insights
            </h2>
          </div>

          <p className="mt-2 text-sm text-gray-400">
            Automated interpretation of forecast,
            demand, revenue, and AOV trends.
          </p>
        </div>

        {insights.generatedAt && (
          <p className="text-xs text-gray-400">
            Generated{" "}
            {formatShortDate(
              insights.generatedAt
            )}
          </p>
        )}
      </div>

      {/* REVENUE OUTLOOK */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Revenue Outlook
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* NEXT 7 DAYS */}
          <div className="rounded-xl border border-white/10 bg-blue-500/[0.08] p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-300" />

              <p className="text-[11px] font-medium text-gray-400">
                Next 7 Days
              </p>
            </div>

            <p className="mt-2 text-xl font-bold text-gray-100">
              {formatCurrency(
                outlook?.next7Days
              )}
            </p>
          </div>

          {/* NEXT 30 DAYS */}
          <div className="rounded-xl border border-white/10 bg-purple-500/[0.08] p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-purple-300" />

              <p className="text-[11px] font-medium text-gray-400">
                Next 30 Days
              </p>
            </div>

            <p className="mt-2 text-xl font-bold text-gray-100">
              {formatCurrency(
                outlook?.next30Days
              )}
            </p>
          </div>

          {/* PEAK DAY */}
          <div className="rounded-xl border border-white/10 bg-emerald-500/[0.08] p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-300" />

              <p className="text-[11px] font-medium text-gray-400">
                Peak Forecast Day
              </p>
            </div>

            {peakDay ? (
              <>
                <p className="mt-2 text-xl font-bold text-gray-100">
                  {formatCurrency(
                    peakDay.predictedRevenue
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {formatShortDate(
                    peakDay.date
                  )}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xl font-bold text-gray-300">
                —
              </p>
            )}
          </div>

          {/* LOWEST DAY */}
          <div className="rounded-xl border border-white/10 bg-red-500/[0.08] p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-300" />

              <p className="text-[11px] font-medium text-gray-400">
                Lowest Forecast Day
              </p>
            </div>

            {lowestDay ? (
              <>
                <p className="mt-2 text-xl font-bold text-gray-100">
                  {formatCurrency(
                    lowestDay.predictedRevenue
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {formatShortDate(
                    lowestDay.date
                  )}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xl font-bold text-gray-300">
                —
              </p>
            )}
          </div>
        </div>
      </div>

      {/* TREND ANALYSIS */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Business Trend Analysis
        </h3>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <TrendSummary
            title="Revenue"
            trend={
              insights.revenueTrend
            }
            icon={
              <DollarSign className="h-4 w-4" />
            }
            recentLabel="Recent Revenue"
            projectedLabel="7-Day Forecast"
            recentValue={
              insights.revenueTrend
                ?.recentRevenue
            }
            projectedValue={
              insights.revenueTrend
                ?.projectedRevenue
            }
            formatValue={formatCurrency}
          />

          <TrendSummary
            title="Demand"
            trend={
              insights.demandTrend
            }
            icon={
              <ShoppingCart className="h-4 w-4" />
            }
            recentLabel="Recent Orders"
            projectedLabel="Projected Orders"
            recentValue={
              insights.demandTrend
                ?.recentOrders
            }
            projectedValue={
              insights.demandTrend
                ?.projectedOrders
            }
            formatValue={(value) =>
              value === null ||
              value === undefined
                ? "—"
                : value.toFixed(2)
            }
          />

          <TrendSummary
            title="Average Order Value"
            trend={
              insights.aovTrend
            }
            icon={
              <WalletCards className="h-4 w-4" />
            }
            recentLabel="Recent AOV"
            projectedLabel="Projected AOV"
            recentValue={
              insights.aovTrend
                ?.recentAOV
            }
            projectedValue={
              insights.aovTrend
                ?.projectedAOV
            }
            formatValue={formatCurrency}
          />
        </div>
      </div>

      {/* PEAK DAYS */}
      {insights.peakDays &&
        insights.peakDays.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Expected Peak Days
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insights.peakDays
                .slice(0, 3)
                .map((day) => (
                  <div
                    key={day.date}
                    className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] p-4"
                  >
                    <p className="text-sm font-semibold text-gray-100">
                      {formatShortDate(
                        day.date
                      )}
                    </p>

                    <p className="mt-1 text-lg font-bold text-emerald-300">
                      {formatCurrency(
                        day.predictedRevenue
                      )}
                    </p>

                    {day.deviationFromAveragePercent !==
                      undefined && (
                      <p className="mt-1 text-xs text-gray-400">
                        {formatPercent(
                          day.deviationFromAveragePercent
                        )}{" "}
                        vs average
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
    </section>
  );
}