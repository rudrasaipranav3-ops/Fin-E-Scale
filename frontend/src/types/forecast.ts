export interface ForecastPoint {
  period: string;
  historicalRevenue?: number | null;
  predictedRevenue: number | null;

  expectedOrders?: number | null;
  predictedOrders?: number | null;
  predictedAOV?: number | null;

  lowerBound: number | null;
  upperBound: number | null;
}

export interface ModelComparisonEntry {
  algorithm: string;
  wape: number | null;
  improvementOverBaselinePercent?: number | null;
  improvementOverV4Percent?: number | null;
}

export interface ModelComparison {
  baseline?: ModelComparisonEntry;
  v4?: ModelComparisonEntry;
  v4_1?: ModelComparisonEntry;
  bestModel?: string;
}

export interface ForecastTrend {
  direction:
    | "increasing"
    | "decreasing"
    | "stable"
    | "insufficient-data";

  changePercent: number | null;

  recentOrders?: number | null;
  projectedOrders?: number | null;

  recentAOV?: number | null;
  projectedAOV?: number | null;

  recentRevenue?: number | null;
  projectedRevenue?: number | null;
}

export interface RevenueOutlook {
  next7Days: number;
  next30Days: number;
  averageDailyRevenue: number;

  peakDay?: {
    date: string;
    predictedRevenue: number;
  } | null;

  lowestDay?: {
    date: string;
    predictedRevenue: number;
  } | null;
}

export interface PeakDay {
  date: string;
  predictedRevenue: number;
  rank?: number;
  deviationFromAveragePercent?: number | null;
}

export interface RiskAlert {
  level: "low" | "medium" | "high" | string;
  type: string;
  title?: string;
  message: string;
}

export interface Recommendation {
  priority: "low" | "medium" | "high" | string;
  category: string;

  title?: string;
  metric?: string;
  changePercent?: number | null;

  recommendation: string;

  supportingDates?: string[];
}

export interface BusinessInsights {
  generatedAt: string;

  revenueOutlook: RevenueOutlook;

  demandTrend: ForecastTrend;

  aovTrend: ForecastTrend;

  revenueTrend: ForecastTrend;

  peakDays: PeakDay[];

  riskAlerts: RiskAlert[];

  recommendations: Recommendation[];
}

export interface ForecastResponseData {
  algorithm: string;

  modelVersion: string;

  horizon: number;

  historyPoints: number;

  forecastCount: number;

  totalPredictedRevenue: number;

  mae: number;
  rmse: number;
  mape: number;
  wape: number;
  smape: number;

  evaluationDays: number;

  evaluation?: {
    status?: string;
    confidence?: string;
    explanation?: string;
    [key: string]: unknown;
  } | null;

  dataQuality?: {
    quality?: string;
    observedDays?: number;
    calendarDays?: number;
    [key: string]: unknown;
  } | null;

  modelDiagnostics?: Record<string, unknown> | null;

  baselineComparison?: Record<string, unknown> | null;

  modelComparison: ModelComparison | null;

  businessInsights: BusinessInsights | null;

  /**
   * Day-level explanations generated from the
   * existing V4.1 forecast output.
   *
   * This does not change the forecasting model.
   */
  forecastExplainability?:
    | ForecastExplanation[]
    | null;

  points: ForecastPoint[];

  generatedAt?: string;
}

export interface ForecastApiResponse {
  success: boolean;

  message?: string;

  data: ForecastResponseData;
}

export interface ForecastExplanationReason {
  type: string;
  message: string;
  impact: "positive" | "negative" | string;
}

export interface ForecastExplanation {
  date: string;
  weekday: string | null;

  predictedRevenue: number;
  expectedOrders: number;
  predictedAOV: number;

  revenuePosition:
    | "high"
    | "low"
    | "normal"
    | "unknown"
    | string;

  deviationFromAveragePercent:
    number | null;

  reasons: ForecastExplanationReason[];

  businessImplication: string;
}