"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import type { RiskAlert } from "@/types/forecast";


interface RiskAlertsProps {
  alerts: RiskAlert[] | null | undefined;
}

function getRiskSurface(level: string) {
  switch (level) {
    case "high":
      return "border-red-400/20 bg-red-500/[0.06] text-red-200";
    case "medium":
      return "border-amber-400/20 bg-amber-500/[0.06] text-amber-200";
    case "low":
      return "border-blue-400/20 bg-blue-500/[0.06] text-blue-200";
    default:
      return "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-200";
  }
}

function getRiskIcon(level: string) {
  switch (level) {
    case "high":
      return (
        <AlertTriangle className="h-5 w-5" />
      );

    case "medium":
      return (
        <ShieldAlert className="h-5 w-5" />
      );

    case "low":
      return (
        <AlertCircle className="h-5 w-5" />
      );

    default:
      return (
        <CheckCircle2 className="h-5 w-5" />
      );
  }
}

export default function RiskAlerts({
  alerts,
}: RiskAlertsProps) {
  const safeAlerts = alerts ?? [];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-7 shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-500/10 p-3 text-orange-400">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Forecast Risk Alerts
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Potential factors that may affect forecast
              reliability or business performance.
            </p>
          </div>
        </div>
      </div>

      {/* NO ALERTS */}
      {safeAlerts.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />

          <div>
            <p className="text-sm font-semibold text-emerald-300">
              No significant risk alerts detected
            </p>

            <p className="mt-1 text-xs text-emerald-400/80">
              The current forecast does not contain any
              additional risk indicators.
            </p>
          </div>
        </div>
      )}

      {/* ALERTS */}
      {safeAlerts.length > 0 && (
        <div className="space-y-3">
          {safeAlerts.map((alert, index) => {
            const level =
              alert.level ?? "low";

            return (
              <article
                key={`${alert.type}-${index}`}
                className={`rounded-xl border p-4 backdrop-blur-sm ${getRiskSurface(
                  level
                )}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {getRiskIcon(level)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-100">
                        {alert.title ??
                          alert.type
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (letter) =>
                              letter.toUpperCase()
                            )}
                      </p>

                      <span className="rounded-full border border-current px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {level}
                      </span>
                    </div>

                    <p className="mt-2 text-[13px] leading-6 text-gray-300">
                      {alert.message}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* EXPLANATION */}
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-xs leading-5 text-gray-400">
          Risk alerts are generated from historical
          patterns and forecast conditions. They indicate
          areas that may require additional business
          attention; they do not represent guaranteed
          outcomes.
        </p>
      </div>
    </section>
  );
}