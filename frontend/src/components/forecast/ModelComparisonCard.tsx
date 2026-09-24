"use client";

import {
  CheckCircle2,
  Trophy,
} from "lucide-react";

import type {
  ModelComparison,
} from "@/types/forecast";

import {
  formatPercent,
  getModelDisplayName,
} from "@/utils/forecast";

interface ModelComparisonCardProps {
  comparison:
    | ModelComparison
    | null
    | undefined;
}

function WapeValue({
  value,
}: {
  value: number | null | undefined;
}) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}

function ImprovementValue({
  value,
}: {
  value: number | null | undefined;
}) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return formatPercent(value);
}

export default function ModelComparisonCard({
  comparison,
}: ModelComparisonCardProps) {
  if (!comparison) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/[0.04] p-3 text-gray-400">
            <Trophy className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              Model Comparison
            </h2>

            <p className="text-sm text-gray-400">
              No model comparison data available.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const models = [
    {
      key: "baseline",
      name: getModelDisplayName("baseline"),
      algorithm:
        comparison.baseline?.algorithm,
      wape: comparison.baseline?.wape,
      improvement: null,
    },
    {
      key: "v4",
      name: getModelDisplayName("v4"),
      algorithm:
        comparison.v4?.algorithm,
      wape: comparison.v4?.wape,
      improvement:
        comparison.v4
          ?.improvementOverBaselinePercent ??
        null,
    },
    {
      key: "v4_1",
      name: getModelDisplayName("v4_1"),
      algorithm:
        comparison.v4_1?.algorithm,
      wape: comparison.v4_1?.wape,
      improvement:
        comparison.v4_1
          ?.improvementOverBaselinePercent ??
        null,
    },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">
            Model Comparison
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            WAPE comparison across the baseline,
            V4, and V4.1 forecasting models.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />

          Best Model:{" "}
          {getModelDisplayName(
            comparison.bestModel
          )}
        </div>
      </div>

      {/* MODEL CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {models.map((model) => {
          const isBest =
            model.key === comparison.bestModel;

          return (
            <div
              key={model.key}
              className={`relative rounded-xl border p-5 transition ${
                isBest
                  ? "border-emerald-400/30 bg-emerald-500/[0.08] shadow-sm"
                  : "border-white/10 bg-white/[0.025]/50"
              }`}
            >
              {/* BEST BADGE */}
              {isBest && (
                <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  <Trophy className="h-3.5 w-3.5" />
                  Best
                </div>
              )}

              <p className="text-sm font-medium text-gray-400">
                {model.name}
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-100">
                {WapeValue({
                  value: model.wape,
                })}
              </p>

              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                WAPE
              </p>

              {model.improvement !== null && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400">
                    Improvement vs baseline
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      model.improvement > 0
                        ? "text-emerald-300"
                        : model.improvement < 0
                          ? "text-red-300"
                          : "text-gray-300"
                    }`}
                  >
                    {ImprovementValue({
                      value: model.improvement,
                    })}
                  </p>
                </div>
              )}

              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs text-gray-400">
                  Algorithm
                </p>

                <p className="mt-1 break-words text-xs leading-5 text-gray-300">
                  {model.algorithm || "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* V4.1 SPECIFIC COMPARISON */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-400">
              V4.1 improvement over baseline
            </p>

            <p className="mt-1 text-lg font-semibold text-emerald-300">
              {ImprovementValue({
                value:
                  comparison.v4_1
                    ?.improvementOverBaselinePercent,
              })}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              V4.1 improvement over V4
            </p>

            <p className="mt-1 text-lg font-semibold text-emerald-300">
              {ImprovementValue({
                value:
                  comparison.v4_1
                    ?.improvementOverV4Percent,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* EXPLANATION */}
      <div className="mt-5">
        <p className="text-xs leading-5 text-gray-400">
          Lower WAPE indicates better forecasting
          accuracy. The model with the lowest
          evaluated WAPE is selected as the best
          model for the current holdout evaluation.
        </p>
      </div>
    </section>
  );
}