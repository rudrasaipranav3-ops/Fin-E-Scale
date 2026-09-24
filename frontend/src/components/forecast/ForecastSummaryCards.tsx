"use client";

import {
  CalendarDays,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import type { RevenueOutlook } from "@/types/forecast";
import {
  formatCurrency,
  formatShortDate,
} from "@/utils/forecast";

interface ForecastSummaryCardsProps {
  outlook: RevenueOutlook | null | undefined;
}

export default function ForecastSummaryCards({
  outlook,
}: ForecastSummaryCardsProps) {
  if (!outlook) {
    return (
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          "7-Day Revenue",
          "30-Day Revenue",
          "Average Daily Revenue",
          "Peak Forecast Day",
        ].map((title) => (
          <div
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30 hover:bg-white/[0.055]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />
            <p className="text-sm font-medium text-gray-400">
              {title}
            </p>

            <p className="mt-3 text-2xl font-bold text-gray-400">
              —
            </p>
          </div>
        ))}
      </section>
    );
  }

  const peakDay = outlook.peakDay;

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* 7-DAY REVENUE */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30 hover:bg-white/[0.055]">
        <div className="flex items-start justify-between">
          <div>
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />
            <p className="text-sm font-medium text-gray-400">
              7-Day Revenue
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {formatCurrency(outlook.next7Days)}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Expected revenue for the next 7 days
            </p>
          </div>

          <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-violet-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 30-DAY REVENUE */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30 hover:bg-white/[0.055]">
        <div className="flex items-start justify-between">
          <div>
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />
            <p className="text-sm font-medium text-gray-400">
              30-Day Revenue
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {formatCurrency(outlook.next30Days)}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Expected revenue for the next 30 days
            </p>
          </div>

          <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-violet-400">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* AVERAGE DAILY REVENUE */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30 hover:bg-white/[0.055]">
        <div className="flex items-start justify-between">
          <div>
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />
            <p className="text-sm font-medium text-gray-400">
              Average Daily Revenue
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {formatCurrency(
                outlook.averageDailyRevenue
              )}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Average across the 30-day forecast
            </p>
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-emerald-400">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* PEAK FORECAST DAY */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30 hover:bg-white/[0.055]">
        <div className="flex items-start justify-between">
          <div>
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />
            <p className="text-sm font-medium text-gray-400">
              Peak Forecast Day
            </p>

            {peakDay ? (
              <>
                <p className="mt-2 text-2xl font-bold text-white">
                  {formatCurrency(
                    peakDay.predictedRevenue
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {formatShortDate(peakDay.date)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold text-gray-400">
                  —
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  No peak day available
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-400">
            <Zap className="h-5 w-5" />
          </div>
        </div>
      </div>
    </section>
  );
}