"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  Info,
  XCircle,
} from "lucide-react";

export type DatasetQualitySummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
};

export type DatasetQualityColumns = {
  present: string[];
  required: string[];
  missing: string[];
  unexpected: string[];
};

export type DatasetQualityIssue = {
  type: "error" | "warning" | "info";
  field?: string;
  message: string;
  count?: number;
};

export type DatasetQuality = {
  valid: boolean;
  qualityScore: number;
  qualityStatus: "excellent" | "good" | "needs_review" | "poor" | string;
  summary: DatasetQualitySummary;
  columns: DatasetQualityColumns;
  issues: DatasetQualityIssue[];
  recommendations: string[];
};

export type DatasetInfo = {
  name: string;
  size?: number;
  mimetype?: string;
};

type DatasetQualityPanelProps = {
  quality: DatasetQuality;
  dataset?: DatasetInfo | null;
  onImport?: () => void;
  importing?: boolean;
};

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "Unknown size";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "needs_review":
      return "Needs Review";
    case "poor":
      return "Poor";
    default:
      return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "excellent":
      return {
        badge:
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        icon: "text-emerald-400",
        score: "text-emerald-300",
        progress: "bg-emerald-400",
      };

    case "good":
      return {
        badge:
          "border-sky-400/20 bg-sky-400/10 text-sky-300",
        icon: "text-sky-400",
        score: "text-sky-300",
        progress: "bg-sky-400",
      };

    case "needs_review":
      return {
        badge:
          "border-amber-400/20 bg-amber-400/10 text-amber-300",
        icon: "text-amber-400",
        score: "text-amber-300",
        progress: "bg-amber-400",
      };

    case "poor":
      return {
        badge:
          "border-red-400/20 bg-red-400/10 text-red-300",
        icon: "text-red-400",
        score: "text-red-300",
        progress: "bg-red-400",
      };

    default:
      return {
        badge:
          "border-white/10 bg-white/[0.035] text-gray-300",
        icon: "text-gray-400",
        score: "text-gray-200",
        progress: "bg-violet-400",
      };
  }
}

function getIssueIcon(type: DatasetQualityIssue["type"]) {
  if (type === "error") {
    return <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
  }

  if (type === "warning") {
    return (
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
    );
  }

  return <Info className="h-4 w-4 shrink-0 text-sky-400" />;
}

export default function DatasetQualityPanel({
  quality,
  dataset,
  onImport,
  importing = false,
}: DatasetQualityPanelProps) {
  const statusClasses = getStatusClasses(
    quality.qualityStatus
  );

  const score = Math.max(
    0,
    Math.min(100, Math.round(quality.qualityScore ?? 0))
  );

  const summary = quality.summary;

  const hasErrors =
    quality.issues?.some(
      (issue) => issue.type === "error"
    ) ?? false;

  const missingColumns =
    quality.columns?.missing ?? [];

  const unexpectedColumns =
    quality.columns?.unexpected ?? [];

  const canImport =
    quality.valid &&
    !hasErrors &&
    missingColumns.length === 0;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-[0_20px_70px_rgba(0,0,0,.15)] backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10">
              <FileCheck2 className="h-5 w-5 text-violet-300" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">
                Data Quality
              </h3>

              <p className="mt-1 text-sm text-gray-400">
                Validation results for the selected dataset.
              </p>

              {dataset?.name && (
                <p className="mt-2 text-xs text-gray-500">
                  {dataset.name}
                  {dataset.size
                    ? ` • ${formatFileSize(dataset.size)}`
                    : ""}
                </p>
              )}
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClasses.badge}`}
          >
            <CheckCircle2
              className={`h-3.5 w-3.5 ${statusClasses.icon}`}
            />

            {getStatusLabel(
              quality.qualityStatus
            )}
          </div>
        </div>
      </div>

      {/* Quality score */}
      <div className="grid gap-5 border-b border-white/10 px-5 py-5 sm:grid-cols-[180px_1fr] sm:px-6">
        <div className="flex items-center gap-4">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/10">
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${statusClasses.score}`}
              >
                {score}
              </div>

              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                / 100
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-200">
              Quality Score
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Based on schema, row validity and duplicate checks.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Dataset quality
            </span>

            <span className={statusClasses.score}>
              {score}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusClasses.progress}`}
              style={{ width: `${score}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-gray-500">
            {quality.valid
              ? "The dataset passed the required validation checks."
              : "The dataset requires attention before it can be imported."}
          </p>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 divide-x divide-y divide-white/10 border-b border-white/10 sm:grid-cols-4 sm:divide-y-0">
        <Metric
          label="Total Rows"
          value={summary.totalRows}
        />

        <Metric
          label="Valid Rows"
          value={summary.validRows}
          valueClass="text-emerald-300"
        />

        <Metric
          label="Invalid Rows"
          value={summary.invalidRows}
          valueClass={
            summary.invalidRows > 0
              ? "text-red-300"
              : "text-gray-300"
          }
        />

        <Metric
          label="Duplicates"
          value={summary.duplicateRows}
          valueClass={
            summary.duplicateRows > 0
              ? "text-amber-300"
              : "text-gray-300"
          }
        />
      </div>

      {/* Validation checks */}
      <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-200">
            Validation Checks
          </h4>

          <div className="mt-3 space-y-2">
            <CheckRow
              label="Required columns"
              passed={
                missingColumns.length === 0
              }
              detail={
                missingColumns.length === 0
                  ? "All required columns are present"
                  : `${missingColumns.length} missing`
              }
            />

            <CheckRow
              label="Row validation"
              passed={summary.invalidRows === 0}
              detail={
                summary.invalidRows === 0
                  ? "All rows passed validation"
                  : `${summary.invalidRows} invalid rows`
              }
            />

            <CheckRow
              label="Duplicate detection"
              passed={summary.duplicateRows === 0}
              detail={
                summary.duplicateRows === 0
                  ? "No duplicate rows detected"
                  : `${summary.duplicateRows} duplicates detected`
              }
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-200">
            Schema
          </h4>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Required columns
              </span>

              <span className="font-medium text-gray-300">
                {quality.columns.required.length}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Available columns
              </span>

              <span className="font-medium text-gray-300">
                {quality.columns.present.length}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                Additional columns
              </span>

              <span className="font-medium text-gray-300">
                {unexpectedColumns.length}
              </span>
            </div>

            {missingColumns.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-400/15 bg-red-400/[0.06] p-3">
                <p className="text-xs font-medium text-red-300">
                  Missing columns
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {missingColumns.map(
                    (column) => (
                      <span
                        key={column}
                        className="rounded-md border border-red-400/10 bg-red-400/10 px-2 py-1 text-[11px] text-red-300"
                      >
                        {column}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {unexpectedColumns.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500">
                  Additional columns
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {unexpectedColumns.map(
                    (column) => (
                      <span
                        key={column}
                        className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] text-gray-400"
                      >
                        {column}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Issues */}
      {quality.issues?.length > 0 && (
        <div className="border-t border-white/10 px-5 py-5 sm:px-6">
          <h4 className="text-sm font-semibold text-gray-200">
            Issues Detected
          </h4>

          <div className="mt-3 space-y-2">
            {quality.issues.map(
              (issue, index) => (
                <div
                  key={`${issue.field ?? "issue"}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                >
                  {getIssueIcon(issue.type)}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-5 text-gray-300">
                      {issue.message}
                    </p>

                    {issue.field && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Field: {issue.field}
                      </p>
                    )}
                  </div>

                  {typeof issue.count ===
                    "number" && (
                    <span className="shrink-0 rounded-full bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-gray-400">
                      {issue.count}
                    </span>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {quality.recommendations?.length > 0 && (
        <div className="border-t border-white/10 px-5 py-5 sm:px-6">
          <h4 className="text-sm font-semibold text-gray-200">
            Recommendations
          </h4>

          <div className="mt-3 space-y-2">
            {quality.recommendations.map(
              (recommendation, index) => (
                <div
                  key={`${recommendation}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-violet-400/10 bg-violet-400/[0.04] p-3"
                >
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />

                  <p className="text-xs leading-5 text-gray-300">
                    {recommendation}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Footer / import action */}
      <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-xs">
          {canImport ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />

              <span className="text-gray-400">
                Dataset is ready for import.
              </span>
            </>
          ) : (
            <>
              <FileWarning className="h-4 w-4 text-amber-400" />

              <span className="text-gray-400">
                Resolve the reported issues before importing.
              </span>
            </>
          )}
        </div>

        {onImport && (
          <button
            type="button"
            onClick={onImport}
            disabled={!canImport || importing}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/90 px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {importing
              ? "Importing..."
              : "Import Dataset"}
          </button>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-gray-200",
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="px-4 py-4 text-center sm:px-5">
      <div
        className={`text-xl font-semibold ${valueClass}`}
      >
        {value.toLocaleString()}
      </div>

      <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
    </div>
  );
}

function CheckRow({
  label,
  passed,
  detail,
}: {
  label: string;
  passed: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          passed
            ? "bg-emerald-400/10"
            : "bg-red-400/10"
        }`}
      >
        {passed ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-300">
          {label}
        </p>

        <p
          className={`mt-0.5 text-[11px] ${
            passed
              ? "text-gray-500"
              : "text-red-300"
          }`}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}