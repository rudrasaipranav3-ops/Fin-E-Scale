from typing import List, Optional

from pydantic import BaseModel, Field


class ForecastHistoryItem(BaseModel):
    date: str
    revenue: float = Field(ge=0)
    orders: int = Field(default=0, ge=0)
    observed: Optional[bool] = None


class ForecastRequest(BaseModel):
    history: List[ForecastHistoryItem]
    horizonDays: int = Field(default=30, ge=1, le=365)


class ForecastPoint(BaseModel):
    date: str
    predictedRevenue: float

    # Continuous statistical expectation.
    # Unlike predictedOrders, this is not rounded.
    expectedOrders: Optional[float] = None

    # Whole-number transaction estimate shown to users.
    predictedOrders: Optional[int] = None

    predictedAOV: Optional[float] = None
    lowerBound: Optional[float] = None
    upperBound: Optional[float] = None


class ForecastDataQuality(BaseModel):
    quality: str
    observedDays: int
    calendarDays: int
    missingDays: int


class ForecastEvaluationDay(BaseModel):
    date: str
    weekday: str
    actualRevenue: float
    v4Prediction: float
    v4_1Prediction: float
    baselinePrediction: float
    v4AbsoluteError: float
    v4_1AbsoluteError: float
    baselineAbsoluteError: float
    v4ErrorPercent: Optional[float] = None
    v4_1ErrorPercent: Optional[float] = None
    baselineErrorPercent: Optional[float] = None
    orders: int
    aov: Optional[float] = None
    observed: Optional[bool] = None


class ForecastEvaluation(BaseModel):
    status: str
    confidence: str
    evaluationDays: int
    minimumRecommendedDays: int
    message: Optional[str] = None
    evaluationByDay: List[ForecastEvaluationDay] = Field(default_factory=list)


class ForecastResponse(BaseModel):
    success: bool
    algorithm: str
    modelVersion: str

    mae: Optional[float] = None
    rmse: Optional[float] = None
    mape: Optional[float] = None

    # Sparse-data-aware evaluation metrics
    wape: Optional[float] = None
    smape: Optional[float] = None
    evaluationDays: Optional[int] = None

    # Evaluation reliability/status
    evaluation: Optional[ForecastEvaluation] = None

    # Historical data quality
    dataQuality: Optional[dict] = None
    modelDiagnostics: Optional[dict] = None
    baselineComparison: Optional[dict] = None
    modelComparison: Optional[dict] = None
    expectedOrders: Optional[float] = None

    forecast: List[ForecastPoint]