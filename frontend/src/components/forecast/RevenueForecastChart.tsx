"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ForecastPoint } from "@/types/forecast";
import {
  formatCurrency,
  formatShortDate,
} from "@/utils/forecast";

interface RevenueForecastChartProps {
  points: ForecastPoint[];
}

interface ChartPoint {
  date: string;
  predictedRevenue: number | null;
  lowerBound: number | null;
  upperBound: number | null;
}

function buildChartData(
  points: ForecastPoint[]
): ChartPoint[] {
  return points.map((point) => ({
    date: point.period,
    predictedRevenue: point.predictedRevenue,
    lowerBound:
      point.lowerBound ?? null,
    upperBound:
      point.upperBound ?? null,
  }));
}

function formatAxisDate(value: string) {
  return formatShortDate(value);
}

function formatYAxis(value: number) {
  if (value >= 1000000) {
    return `₹${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(0)}K`;
  }

  return `₹${value}`;
}

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number | string;
    name?: string;
  }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1020]/95 p-4 shadow-xl backdrop-blur-xl">
      <p className="mb-3 text-sm font-semibold text-gray-100">
        {label
          ? formatShortDate(label)
          : "Forecast"}
      </p>

      <div className="space-y-2">
        {payload.map((item) => {
          if (
            item.value === null ||
            item.value === undefined
          ) {
            return null;
          }

          const value = Number(item.value);

          if (!Number.isFinite(value)) {
            return null;
          }

          let labelText = item.name ?? item.dataKey ?? "";

          if (
            item.dataKey ===
            "predictedRevenue"
          ) {
            labelText = "Predicted Revenue";
          }

          if (
            item.dataKey === "lowerBound"
          ) {
            labelText = "Lower Bound";
          }

          if (
            item.dataKey === "upperBound"
          ) {
            labelText = "Upper Bound";
          }

          return (
            <div
              key={`${item.dataKey}-${labelText}`}
              className="flex items-center justify-between gap-6 text-sm"
            >
              <span className="text-gray-400">
                {labelText}
              </span>

              <span className="font-semibold text-gray-100">
                {formatCurrency(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RevenueForecastChart({
  points,
}: RevenueForecastChartProps) {
  const chartData = buildChartData(points);

  if (chartData.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">
            Revenue Forecast
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            V4.1 predicted revenue for the
            forecast horizon.
          </p>
        </div>

        <div className="flex h-[360px] items-center justify-center">
          <p className="text-sm text-gray-400">
            No forecast data available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">
            Revenue Forecast
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            V4.1 predicted revenue with forecast
            uncertainty bounds.
          </p>
        </div>

        <div className="rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300">
          V4.1 AI Forecast
        </div>
      </div>

      {/* CHART */}
      <div className="h-[360px] w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(255,255,255,0.08)"
            />

            <XAxis
              dataKey="date"
              tickFormatter={
                formatAxisDate
              }
              tick={{
                fontSize: 12,
                fill: "#cbd5e1",
              }}
              minTickGap={30}
            />

            <YAxis
              tickFormatter={
                formatYAxis
              }
              tick={{
                fontSize: 12,
                fill: "#cbd5e1",
              }}
              width={70}
            />

            <Tooltip
              content={
                <ForecastTooltip />
              }
            />

            <Legend wrapperStyle={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }} />

            <Line
              type="monotone"
              dataKey="predictedRevenue"
              name="Predicted Revenue"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 5,
              }}
            />

            <Line
              type="monotone"
              dataKey="lowerBound"
              name="Lower Bound"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="upperBound"
              name="Upper Bound"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SUMMARY */}
      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray-400">
            Forecast Days
          </p>

          <p className="mt-1 text-lg font-semibold text-gray-100">
            {chartData.length}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">
            Highest Prediction
          </p>

          <p className="mt-1 text-lg font-semibold text-gray-100">
            {formatCurrency(
              Math.max(
                ...chartData
                  .map((point) => point.predictedRevenue)
                  .filter(
                    (value): value is number =>
                      value !== null &&
                      value !== undefined &&
                      Number.isFinite(value)
                  )
              )
            )}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">
            Lowest Prediction
          </p>

          <p className="mt-1 text-lg font-semibold text-gray-100">
            {formatCurrency(
              Math.min(
                ...chartData
                  .map((point) => point.predictedRevenue)
                  .filter(
                    (value): value is number =>
                      value !== null &&
                      value !== undefined &&
                      Number.isFinite(value)
                  )
              )
            )}
          </p>
        </div>
      </div>
    </section>
  );
}