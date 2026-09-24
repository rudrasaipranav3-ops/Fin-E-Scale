"use client";

import {
  ArrowDown,
  ArrowUp,
  Minus,
} from "lucide-react";

import type { ForecastPoint } from "@/types/forecast";

import {
  formatCurrency,
  formatShortDate,
} from "@/utils/forecast";

interface ForecastTableProps {
  points: ForecastPoint[] | null | undefined;
}

function formatNumber(
  value: number | null | undefined,
  decimals = 2
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toFixed(decimals);
}

function getRevenueIndicator(
  revenue: number,
  averageRevenue: number
) {
  if (revenue > averageRevenue * 1.1) {
    return {
      icon: ArrowUp,
      className: "text-emerald-300",
      label: "Above average",
    };
  }

  if (revenue < averageRevenue * 0.9) {
    return {
      icon: ArrowDown,
      className: "text-rose-300",
      label: "Below average",
    };
  }

  return {
    icon: Minus,
    className: "text-gray-400",
    label: "Near average",
  };
}

export default function ForecastTable({
  points,
}: ForecastTableProps) {
  const safePoints = points ?? [];

  if (safePoints.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-gray-100">
          Forecast Details
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          No forecast details are currently available.
        </p>
      </section>
    );
  }

  const validRevenueValues: number[] =
  safePoints
    .map((point) => point.predictedRevenue)
    .filter(
      (value): value is number =>
        value !== null &&
        value !== undefined &&
        Number.isFinite(value)
    );

const averageRevenue =
  validRevenueValues.length > 0
    ? validRevenueValues.reduce(
        (sum, value) => sum + value,
        0
      ) / validRevenueValues.length
    : 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
      {/* HEADER */}
      <div className="border-b border-white/10 bg-white/[0.01] p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              Forecast Details
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Daily V4.1 forecast values for the
              current forecast horizon.
            </p>
          </div>

          <div className="rounded-lg bg-white/[0.02] px-3 py-2 text-xs font-medium text-gray-400">
            {safePoints.length} forecast days
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-300">
                Date
              </th>

              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Predicted Revenue
              </th>

              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Orders
              </th>

              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Predicted AOV
              </th>

              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Lower Bound
              </th>

              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                Upper Bound
              </th>
            </tr>
          </thead>

          <tbody>
            {safePoints.map(
              (point, index) => {
                const indicator =
  point.predictedRevenue !== null &&
  point.predictedRevenue !== undefined
    ? getRevenueIndicator(
        point.predictedRevenue,
        averageRevenue
      )
    : {
        icon: Minus,
        className: "text-gray-400",
        label: "Unavailable",
      };

                const IndicatorIcon =
                  indicator.icon;

                return (
                  <tr
                    key={`${point.period}-${index}`}
                    className="border-b border-white/10 transition hover:bg-white/[0.02]"
                  >
                    {/* DATE */}
                    <td className="whitespace-nowrap px-5 py-[18px]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-50">
                          {formatShortDate(
                            point.period
                          )}
                        </span>
                      </div>
                    </td>

                    {/* REVENUE */}
                    <td className="px-5 py-[18px] text-right">
                      <div className="flex items-center justify-end gap-2">
                        <IndicatorIcon
                          className={`h-4 w-4 ${indicator.className}`}
                        />

                        <span className="text-sm font-semibold text-gray-100">
                          {formatCurrency(
                            point.predictedRevenue
                          )}
                        </span>
                      </div>
                    </td>

                    {/* ORDERS */}
                    <td className="px-5 py-[18px] text-right">
                      <span className="text-sm text-gray-300">
                        {formatNumber(
                          point.predictedOrders ??
                            point.expectedOrders
                        )}
                      </span>
                    </td>

                    {/* AOV */}
                    <td className="px-5 py-[18px] text-right">
                      <span className="text-sm text-gray-300">
                        {formatCurrency(
                          point.predictedAOV
                        )}
                      </span>
                    </td>

                    {/* LOWER BOUND */}
                    <td className="px-5 py-[18px] text-right">
                      <span className="text-sm text-gray-400">
                        {formatCurrency(
                          point.lowerBound
                        )}
                      </span>
                    </td>

                    {/* UPPER BOUND */}
                    <td className="px-5 py-[18px] text-right">
                      <span className="text-sm text-gray-400">
                        {formatCurrency(
                          point.upperBound
                        )}
                      </span>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="border-t border-white/10 bg-white/[0.02] px-6 py-4">
        <p className="text-xs leading-5 text-gray-500">
          Revenue indicators compare each predicted day
          with the average predicted revenue across the
          current forecast horizon. Lower and upper bounds
          represent the model's forecast uncertainty
          range.
        </p>
      </div>
    </section>
  );
}