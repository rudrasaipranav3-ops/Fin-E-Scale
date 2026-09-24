"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Lightbulb,
  Target,
} from "lucide-react";

import type { Recommendation } from "@/types/forecast";

import {
  formatPercent,
  formatShortDate,
  getPriorityClass,
} from "@/utils/forecast";

interface AIRecommendationsProps {
  recommendations:
    | Recommendation[]
    | null
    | undefined;
}

function PriorityIcon({
  priority,
}: {
  priority: string;
}) {
  switch (priority) {
    case "high":
      return (
        <AlertTriangle className="h-5 w-5" />
      );

    case "medium":
      return (
        <Target className="h-5 w-5" />
      );

    default:
      return (
        <Lightbulb className="h-5 w-5" />
      );
  }
}

export default function AIRecommendations({
  recommendations,
}: AIRecommendationsProps) {
  if (
    !recommendations ||
    recommendations.length === 0
  ) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-300">
            <Lightbulb className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              AI Recommendations
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              No business recommendations are currently
              available.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-300">
            <Lightbulb className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              AI Business Recommendations
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Actionable recommendations generated from
              forecast trends, demand, AOV, and revenue
              conditions.
            </p>
          </div>
        </div>
      </div>

      {/* RECOMMENDATIONS */}
      <div className="space-y-4">
        {recommendations.map(
          (recommendation, index) => {
            const priority =
              recommendation.priority ??
              "low";

            const supportingDates =
              recommendation.supportingDates ??
              [];

            return (
              <article
                key={`${recommendation.category}-${index}`}
                className="rounded-xl border border-white/10 bg-white/[0.025] p-5 transition-all hover:border-violet-500/30 hover:bg-white/[0.04]"
              >
                {/* TOP ROW */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getPriorityClass(
                        priority
                      )}`}
                    >
                      <PriorityIcon
                        priority={priority}
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-100">
                          {recommendation.title ??
                            "Business Recommendation"}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getPriorityClass(
                            priority
                          )}`}
                        >
                          {priority}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                        {recommendation.category}
                      </p>
                    </div>
                  </div>

                  {recommendation.changePercent !==
                    undefined &&
                    recommendation.changePercent !==
                      null && (
                      <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-right">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">
                          Change
                        </p>

                        <p
                          className={`text-sm font-bold ${
                            recommendation.changePercent <
                            0
                              ? "text-red-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {formatPercent(
                            recommendation.changePercent
                          )}
                        </p>
                      </div>
                    )}
                </div>

                {/* RECOMMENDATION TEXT */}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex gap-3">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />

                    <p className="text-sm leading-6 text-gray-300">
                      {recommendation.recommendation}
                    </p>
                  </div>
                </div>

                {/* SUPPORTING DATES */}
                {supportingDates.length >
                  0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gray-400" />

                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Supporting Forecast Days
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {supportingDates.map(
                        (date) => (
                          <span
                            key={date}
                            className="rounded-lg border border-white/10 bg-[#090d1d] px-3 py-1.5 text-xs font-medium text-gray-400"
                          >
                            {formatShortDate(
                              date
                            )}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* METRIC */}
                {recommendation.metric && (
                  <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />

                    <p className="text-xs text-gray-400">
                      Metric:
                    </p>

                    <p className="text-xs font-semibold uppercase text-gray-300">
                      {recommendation.metric}
                    </p>
                  </div>
                )}
              </article>
            );
          }
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-6 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.08] p-4">
        <p className="text-xs leading-5 text-indigo-700">
          These recommendations are generated from
          the current V4.1 forecast and recent observed
          business performance. They are intended to
          support business decisions and should be
          reviewed alongside operational context.
        </p>
      </div>
    </section>
  );
}