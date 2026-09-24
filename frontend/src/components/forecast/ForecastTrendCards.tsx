"use client";

import {
  Activity,
  ShoppingCart,
  WalletCards,
} from "lucide-react";

import type { ForecastTrend } from "@/types/forecast";

import {
  formatCurrency,
  formatPercent,
  getTrendLabel,
  getTrendSymbol,
  getTrendTextClass,
} from "@/utils/forecast";

interface ForecastTrendCardsProps {
  revenueTrend: ForecastTrend | null | undefined;
  demandTrend: ForecastTrend | null | undefined;
  aovTrend: ForecastTrend | null | undefined;
}

function TrendCard({
  title,
  description,
  trend,
  icon,
  valueLabel,
  recentValue,
  projectedValue,
  formatValue,
}: {
  title: string;
  description: string;
  trend: ForecastTrend | null | undefined;
  icon: React.ReactNode;
  valueLabel: string;
  recentValue: number | null | undefined;
  projectedValue: number | null | undefined;
  formatValue: (value: number | null | undefined) => string;
}) {
  const direction =
    trend?.direction ?? "insufficient-data";

  const changePercent =
    trend?.changePercent ?? null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl transition-all hover:border-violet-500/30 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300">
            {title}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {description}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-gray-300 backdrop-blur-sm">
          {icon}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span
          className={`text-3xl font-bold ${getTrendTextClass(
            direction
          )}`}
        >
          {getTrendSymbol(direction)}
        </span>

        <span
          className={`text-lg font-semibold ${getTrendTextClass(
            direction
          )}`}
        >
          {formatPercent(changePercent)}
        </span>
      </div>

      <p
        className={`mt-1 text-sm font-medium ${getTrendTextClass(
          direction
        )}`}
      >
        {getTrendLabel(direction)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
        <div>
          <p className="text-xs text-gray-400">
            Recent
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-200">
            {formatValue(recentValue)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">
            Projected
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-200">
            {formatValue(projectedValue)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 backdrop-blur-sm">
        <p className="text-xs text-gray-400">
          Change compares recent observed performance
          with the next 7-day forecast.
        </p>
      </div>
    </div>
  );
}

export default function ForecastTrendCards({
  revenueTrend,
  demandTrend,
  aovTrend,
}: ForecastTrendCardsProps) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-200">
          Trend Analysis
        </h2>

        <p className="mt-1 text-sm text-gray-400">
          Comparison between recent observed business
          performance and the V4.1 forecast.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrendCard
          title="Revenue Trend"
          description="Forecast revenue vs recent revenue"
          trend={revenueTrend}
          icon={
            <Activity className="h-5 w-5" />
          }
          valueLabel="Revenue"
          recentValue={
            revenueTrend?.recentRevenue
          }
          projectedValue={
            revenueTrend?.projectedRevenue
          }
          formatValue={formatCurrency}
        />

        <TrendCard
          title="Demand Trend"
          description="Forecast orders vs recent orders"
          trend={demandTrend}
          icon={
            <ShoppingCart className="h-5 w-5" />
          }
          valueLabel="Orders"
          recentValue={
            demandTrend?.recentOrders
          }
          projectedValue={
            demandTrend?.projectedOrders
          }
          formatValue={(value) =>
            value === null ||
            value === undefined
              ? "—"
              : value.toFixed(2)
          }
        />

        <TrendCard
          title="AOV Trend"
          description="Forecast AOV vs recent AOV"
          trend={aovTrend}
          icon={
            <WalletCards className="h-5 w-5" />
          }
          valueLabel="AOV"
          recentValue={
            aovTrend?.recentAOV
          }
          projectedValue={
            aovTrend?.projectedAOV
          }
          formatValue={formatCurrency}
        />
      </div>
    </section>
  );
}