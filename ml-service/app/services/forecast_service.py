from datetime import timedelta

import numpy as np
import pandas as pd


# =========================================================
# CONFIGURATION
# =========================================================

MODEL_VERSION = "sales-forecast-v4.1"

# =========================================================
# V3 MODEL CONFIGURATION
# =========================================================

AOV_WINDOW = 30

# Winsorization limits for revenue.
WINSOR_LOWER_QUANTILE = 0.05
WINSOR_UPPER_QUANTILE = 0.90

# Robust log-space spike threshold.
SPIKE_MAD_MULTIPLIER = 3.0

# Weekday seasonality shrinkage.
WEEKDAY_PRIOR_STRENGTH = 6.0
MIN_WEEKDAY_FACTOR = 0.85
MAX_WEEKDAY_FACTOR = 1.15

# Order forecast bounds.
MIN_ORDER_FORECAST = 0.0
MAX_ORDER_GROWTH = 0.25

# AOV safeguards.
MIN_AOV = 1.0
MAX_AOV_MULTIPLIER = 2.5

# =========================================================
# V4 MODEL CONFIGURATION
# =========================================================

# Weekday AOV seasonality shrinkage. Deliberately much more
# conservative than the order-count weekday factor, since AOV
# is noisier per-day and the dataset only has a few dozen
# observed days -- a strong prior toward 1.0 avoids overfitting
# a handful of unusual-basket days into "AOV is 15% higher on
# Tuesdays".
AOV_WEEKDAY_SHRINKAGE = 0.35
MIN_AOV_WEEKDAY_FACTOR = 0.90
MAX_AOV_WEEKDAY_FACTOR = 1.10
AOV_WEEKDAY_MIN_SAMPLES = 2


# =========================================================
# V4.1 MODEL CONFIGURATION
# =========================================================
#
# V4.1 adds lag features, 7-day rolling averages, and
# constrained recent-vs-previous-7-day trend ratios for
# revenue, orders, and AOV on top of the V4 orders x AOV
# model. Trend ratios are deliberately clipped so a single
# abnormal transaction (see Aug 7-9 AOV spikes in the
# holdout) cannot cause an outsized forecast jump, while a
# "spike regime" check allows repeated recent spikes to be
# incorporated more fully, since that looks more like a
# genuine demand shift than a one-off outlier.
#
# Every extracted feature actually feeds a prediction:
# orderTrend/aovTrend (+ spike damping) drive the main trend
# adjustment; lag1/lag7/rolling7 drive a small bounded
# "recency_adj" nudge on top of that (_v41_recency_adjustment);
# and revenueLag1/revenueLag7/revenueRolling7/revenueTrend
# drive a bounded AOV calibration cross-check
# (_v41_revenue_trend_calibration). All of these are
# intentionally minor and clipped -- see RECENCY_ADJ_* and
# REVENUE_CALIBRATION_* below -- so no single signal can swing
# the forecast far; they exist to make the model genuinely
# feature-driven rather than feature-diagnostic.

# Recent-vs-previous 7-day trend bounds for revenue/orders.
TREND_LOWER = 0.60
TREND_UPPER = 1.60

# Recent-vs-previous 7-day trend bounds for AOV. Tighter than
# the revenue/order trend bounds since AOV already has its own
# weekday factor and safeguards (MIN_AOV / MAX_AOV_MULTIPLIER).
AOV_TREND_LOWER = 0.85
AOV_TREND_UPPER = 1.20

# How many recent observed days are inspected to decide whether
# a spike looks like a one-off event or a repeated regime shift.
SPIKE_REGIME_WINDOW = 10

# Trend-deviation damping factors. A damping of 1.0 fully applies
# the trend ratio; 0.0 ignores it and falls back to the V4
# baseline entirely.
SPIKE_DAMPING_NONE = 1.00        # no recent spikes -> apply trend fully
SPIKE_DAMPING_SINGLE = 0.35      # one recent spike -> mostly dampen it
SPIKE_DAMPING_REPEATED = 0.75    # 2+ recent spikes -> likely regime change
SPIKE_DAMPING_SPARSE = 0.30      # too little data to judge -> stay conservative

# Blend weights for the V4.1 AOV estimate:
#   predicted_AOV = weighted(historical_AOV, recent_7_day_AOV, previous_7_day_AOV)
AOV_WEIGHT_HISTORICAL = 0.50
AOV_WEIGHT_RECENT_7 = 0.30
AOV_WEIGHT_PREVIOUS_7 = 0.20

# Minimum calendar days of history needed before a recent-vs-
# previous 7-day trend can be computed at all (7 + 7).
TREND_MIN_HISTORY_DAYS = 14

# ---------------------------------------------------------
# Recency adjustments: small, tightly-bounded nudges that let
# the lag-1 / lag-7 / rolling-7 features (previously computed
# but never consumed by a prediction) actually move the
# forecast. These are deliberately minor -- the 14-day
# recent-vs-previous trend ratio (orderTrend/aovTrend) already
# does the heavy lifting, so these only fine-tune around it.
# ---------------------------------------------------------

# Orders: how strongly ordersLag1/ordersLag7 vs ordersRolling7
# can move the forecast, and how far.
RECENCY_ADJ_WEIGHT_ORDERS = 0.15
RECENCY_ADJ_LOWER = 0.95
RECENCY_ADJ_UPPER = 1.05

# AOV: same idea, tighter, since AOV is noisier day-to-day.
RECENCY_ADJ_WEIGHT_AOV = 0.10
AOV_RECENCY_ADJ_LOWER = 0.97
AOV_RECENCY_ADJ_UPPER = 1.03

# Revenue-trend calibration: nudges predicted AOV (not revenue
# directly, so predictedOrders x predictedAOV = predictedRevenue
# still holds exactly) toward what revenueLag1/revenueLag7/
# revenueRolling7/revenueTrend independently suggest.
REVENUE_CALIBRATION_WEIGHT = 0.12
REVENUE_CALIBRATION_LOWER = 0.92
REVENUE_CALIBRATION_UPPER = 1.08


MIN_HISTORY_POINTS = 5

# Number of historical days used for the recent baseline.
BASELINE_WINDOW = 14

# Number of calendar days used for rolling forecast evaluation.
# Slightly wider than the minimum 14 observed-day requirement so
# missing calendar dates do not unnecessarily shrink the holdout.
EVALUATION_CALENDAR_DAYS = 28

# Maximum amount by which the legacy baseline model is allowed
# to change per day as a percentage of its baseline. Retained
# only so the "robust-weighted-moving-average" comparison model
# used in baselineComparison behaves exactly as it did pre-v3.
MAX_DAILY_TREND_RATIO = 0.03

# Minimum trend magnitude in absolute currency units (legacy model).
MIN_DAILY_TREND = 1.0

# Prediction interval multiplier.
CONFIDENCE_Z = 1.96


# =========================================================
# GENERAL HELPERS
# =========================================================

def _safe_float(value, fallback=0.0):
    try:
        number = float(value)

        if np.isfinite(number):
            return number

        return fallback
    except (TypeError, ValueError):
        return fallback


def _weighted_average(values):
    """
    Calculate a recency-weighted average.

    More recent observations receive greater weight,
    but extreme spikes are handled separately before
    this function is called.
    """

    values = np.asarray(values, dtype=float)

    if len(values) == 0:
        return 0.0

    weights = np.arange(1, len(values) + 1, dtype=float)

    weights /= weights.sum()

    return float(np.sum(values * weights))


def _robust_clip(values):
    """
    Reduce the influence of extreme revenue spikes.

    Uses the median and MAD (Median Absolute Deviation)
    rather than allowing a single unusually large order
    to dominate the forecast trend.
    """

    values = np.asarray(values, dtype=float)

    if len(values) < 3:
        return values.copy()

    median = float(np.median(values))

    deviations = np.abs(values - median)

    mad = float(np.median(deviations))

    if not np.isfinite(mad) or mad <= 0:
        return values.copy()

    robust_std = 1.4826 * mad

    lower = median - (3.0 * robust_std)
    upper = median + (3.0 * robust_std)

    return np.clip(values, lower, upper)


# =========================================================
# ROBUST REVENUE HELPERS (V3)
# =========================================================

def _winsorize_revenue(values):
    """
    Winsorize revenue using percentile limits.

    This prevents a few very large transactions from dominating
    the baseline while preserving the overall distribution.
    """
    values = np.asarray(values, dtype=float)

    values = values[
        np.isfinite(values) & (values >= 0)
    ]

    if len(values) < 5:
        return values.copy()

    lower = float(
        np.quantile(
            values,
            WINSOR_LOWER_QUANTILE,
        )
    )

    upper = float(
        np.quantile(
            values,
            WINSOR_UPPER_QUANTILE,
        )
    )

    if upper <= lower:
        return values.copy()

    return np.clip(
        values,
        lower,
        upper,
    )


def _log_robust_baseline(values):
    """
    Estimate a robust revenue baseline in log space.

    log1p reduces the influence of highly skewed revenue.
    """
    values = np.asarray(values, dtype=float)

    values = values[
        np.isfinite(values) & (values >= 0)
    ]

    if len(values) == 0:
        return 0.0

    winsorized = _winsorize_revenue(values)

    log_values = np.log1p(
        winsorized
    )

    weights = np.arange(
        1,
        len(log_values) + 1,
        dtype=float,
    )

    weights /= weights.sum()

    log_baseline = float(
        np.sum(
            log_values * weights
        )
    )

    return max(
        0.0,
        float(np.expm1(log_baseline)),
    )


def _detect_revenue_spikes(values):
    """
    Detect exceptional revenue days in log space.

    Returns a boolean mask.
    """
    values = np.asarray(values, dtype=float)

    positive = np.maximum(
        values,
        0.0,
    )

    log_values = np.log1p(
        positive
    )

    median = float(
        np.median(log_values)
    )

    mad = float(
        np.median(
            np.abs(
                log_values - median
            )
        )
    )

    if not np.isfinite(mad) or mad <= 1e-9:
        return np.zeros(
            len(values),
            dtype=bool,
        )

    robust_std = 1.4826 * mad

    threshold = (
        median
        + SPIKE_MAD_MULTIPLIER
        * robust_std
    )

    return (
        log_values > threshold
    )


def _calculate_aov(daily):
    """
    Calculate robust average order value.

    Exceptional revenue days are excluded from the AOV estimate
    so one large transaction does not redefine normal order value.
    """
    if daily is None or len(daily) == 0:
        return None

    if "revenue" not in daily.columns:
        return None

    if "orders" not in daily.columns:
        return None

    frame = daily[
        daily["observed"].astype(bool)
    ].copy()

    frame["revenue"] = pd.to_numeric(
        frame["revenue"],
        errors="coerce",
    )

    frame["orders"] = pd.to_numeric(
        frame["orders"],
        errors="coerce",
    )

    frame = frame[
        np.isfinite(frame["revenue"])
        & np.isfinite(frame["orders"])
        & (frame["revenue"] > 0)
        & (frame["orders"] > 0)
    ]

    if frame.empty:
        return None

    frame = frame.tail(AOV_WINDOW)

    spikes = _detect_revenue_spikes(
        frame["revenue"].to_numpy()
    )

    normal = frame.loc[
        ~spikes
    ].copy()

    if len(normal) < 5:
        normal = frame.copy()

    total_revenue = float(
        normal["revenue"].sum()
    )

    total_orders = float(
        normal["orders"].sum()
    )

    if total_orders <= 0:
        return None

    aov = (
        total_revenue
        / total_orders
    )

    return max(
        MIN_AOV,
        float(aov),
    )


# =========================================================
# WEEKDAY AOV SEASONALITY (V4)
# =========================================================

def _calculate_weekday_aov_factor(daily):
    """
    Estimate a heavily-shrunk weekday factor for AOV (average
    order value), separate from the order-count weekday factor.

    Revenue is highly variable day to day even when order counts
    barely move, because basket size / mix varies. This lets AOV
    drift slightly by weekday instead of holding a single fixed
    AOV across the whole forecast horizon -- without letting a
    handful of unusual days dominate, since the shrinkage here is
    intentionally stronger than the order weekday factor.
    """

    default = {
        weekday: 1.0
        for weekday in range(7)
    }

    if (
        daily is None
        or len(daily) == 0
        or "revenue" not in daily.columns
        or "orders" not in daily.columns
        or "observed" not in daily.columns
    ):
        return default

    frame = daily[
        daily["observed"].astype(bool)
    ].copy()

    frame["revenue"] = pd.to_numeric(
        frame["revenue"],
        errors="coerce",
    )

    frame["orders"] = pd.to_numeric(
        frame["orders"],
        errors="coerce",
    )

    frame = frame[
        np.isfinite(frame["revenue"])
        & np.isfinite(frame["orders"])
        & (frame["revenue"] > 0)
        & (frame["orders"] > 0)
    ]

    if len(frame) < 7:
        return default

    frame["daily_aov"] = (
        frame["revenue"] / frame["orders"]
    )

    spikes = _detect_revenue_spikes(
        frame["daily_aov"].to_numpy()
    )

    frame["normal_aov"] = frame["daily_aov"]
    frame.loc[spikes, "normal_aov"] = np.nan

    overall_values = (
        frame["normal_aov"]
        .dropna()
        .to_numpy(dtype=float)
    )

    if len(overall_values) < 7:
        return default

    overall_baseline = _log_robust_baseline(
        overall_values
    )

    if overall_baseline <= 0:
        return default

    frame["weekday"] = frame.index.weekday

    factors = {}

    for weekday in range(7):

        values = (
            frame.loc[
                frame["weekday"] == weekday,
                "normal_aov",
            ]
            .dropna()
            .to_numpy(dtype=float)
        )

        if len(values) < AOV_WEEKDAY_MIN_SAMPLES:
            factors[weekday] = 1.0
            continue

        weekday_baseline = _log_robust_baseline(
            values
        )

        if weekday_baseline <= 0:
            factors[weekday] = 1.0
            continue

        raw_factor = (
            weekday_baseline
            / overall_baseline
        )

        shrunk_factor = (
            1.0
            + AOV_WEEKDAY_SHRINKAGE
            * (raw_factor - 1.0)
        )

        shrunk_factor = float(
            np.clip(
                shrunk_factor,
                MIN_AOV_WEEKDAY_FACTOR,
                MAX_AOV_WEEKDAY_FACTOR,
            )
        )

        factors[weekday] = shrunk_factor

    return factors


# =========================================================
# WEEKDAY SEASONALITY (V3)
# =========================================================

def _calculate_weekday_seasonality(daily):
    """
    Estimate conservative weekday revenue factors.

    Factors are calculated from robust revenue values and
    shrunk toward 1.0 according to sample size.
    """

    default = {
        weekday: 1.0
        for weekday in range(7)
    }

    if (
        daily is None
        or len(daily) == 0
        or "revenue" not in daily.columns
        or "observed" not in daily.columns
    ):
        return default

    observed = daily[
        daily["observed"].astype(bool)
    ].copy()

    if len(observed) < 14:
        return default

    observed["revenue"] = pd.to_numeric(
        observed["revenue"],
        errors="coerce",
    )

    observed = observed[
        np.isfinite(observed["revenue"])
        & (observed["revenue"] >= 0)
    ]

    if len(observed) < 14:
        return default

    observed["weekday"] = (
        observed.index.weekday
    )

    spikes = _detect_revenue_spikes(
        observed["revenue"].to_numpy()
    )

    observed["normal_revenue"] = (
        observed["revenue"]
        .copy()
    )

    observed.loc[
        spikes,
        "normal_revenue"
    ] = np.nan

    overall_values = (
        observed["normal_revenue"]
        .dropna()
        .to_numpy(dtype=float)
    )

    if len(overall_values) < 7:
        return default

    overall_baseline = _log_robust_baseline(
        overall_values
    )

    if overall_baseline <= 0:
        return default

    seasonality = {}

    for weekday in range(7):

        values = (
            observed.loc[
                observed["weekday"] == weekday,
                "normal_revenue",
            ]
            .dropna()
            .to_numpy(dtype=float)
        )

        count = len(values)

        if count == 0:
            seasonality[weekday] = 1.0
            continue

        weekday_baseline = (
            _log_robust_baseline(values)
        )

        raw_factor = (
            weekday_baseline
            / overall_baseline
        )

        confidence = (
            count
            / (
                count
                + WEEKDAY_PRIOR_STRENGTH
            )
        )

        factor = (
            1.0
            + (
                raw_factor - 1.0
            )
            * confidence
        )

        factor = float(
            np.clip(
                factor,
                MIN_WEEKDAY_FACTOR,
                MAX_WEEKDAY_FACTOR,
            )
        )

        seasonality[weekday] = factor

    return seasonality


# =========================================================
# LEGACY WEEKDAY SEASONALITY (pre-v3, used only for the
# "robust-weighted-moving-average" baselineComparison model)
# =========================================================

def _legacy_weekday_seasonality(daily):
    """
    Reproduce the pre-v3 weekday seasonality estimate.

    This is intentionally kept separate from
    _calculate_weekday_seasonality: it exists only so the
    backtest can compare v3 against the model it replaced.
    """

    if daily is None or len(daily) == 0:
        return {weekday: 1.0 for weekday in range(7)}

    frame = daily.copy()

    if "revenue" not in frame.columns:
        return {weekday: 1.0 for weekday in range(7)}

    if "observed" not in frame.columns:
        return {weekday: 1.0 for weekday in range(7)}

    observed = frame[
        frame["observed"].astype(bool)
    ].copy()

    if len(observed) < 14:
        return {weekday: 1.0 for weekday in range(7)}

    observed["revenue"] = pd.to_numeric(
        observed["revenue"],
        errors="coerce",
    )

    observed = observed[
        np.isfinite(observed["revenue"])
        & (observed["revenue"] >= 0)
    ]

    if len(observed) < 14:
        return {weekday: 1.0 for weekday in range(7)}

    global_values = _robust_clip(
        observed["revenue"].to_numpy(dtype=float)
    )

    global_mean = float(
        np.mean(global_values)
    )

    if (
        not np.isfinite(global_mean)
        or global_mean <= 0
    ):
        return {weekday: 1.0 for weekday in range(7)}

    seasonality = {}

    for weekday in range(7):

        weekday_rows = observed[
            observed.index.dayofweek == weekday
        ]

        count = len(weekday_rows)

        if count < 2:
            seasonality[weekday] = 1.0
            continue

        weekday_values = _robust_clip(
            weekday_rows["revenue"].to_numpy(dtype=float)
        )

        weekday_mean = float(
            np.mean(weekday_values)
        )

        if (
            not np.isfinite(weekday_mean)
            or weekday_mean <= 0
        ):
            seasonality[weekday] = 1.0
            continue

        raw_factor = (
            weekday_mean / global_mean
        )

        confidence = min(
            1.0,
            count / 6.0,
        )

        factor = (
            1.0
            + (raw_factor - 1.0) * confidence
        )

        factor = float(
            np.clip(
                factor,
                0.75,
                1.25,
            )
        )

        seasonality[weekday] = factor

    return seasonality


def _legacy_next_day_prediction(daily_slice, target_weekday):
    """
    Reproduce the pre-v3 "robust-weighted-moving-average" model's
    one-step-ahead revenue prediction.

    Used only as a baseline inside the backtest so v3 can be
    compared against the model it replaced.
    """

    if daily_slice is None or len(daily_slice) == 0:
        return 0.0

    revenue = daily_slice["revenue"].astype(float)
    observed_mask = daily_slice["observed"].astype(bool)
    observed_revenue = revenue.loc[observed_mask].to_numpy(dtype=float)

    if len(observed_revenue) == 0:
        return 0.0

    window = min(BASELINE_WINDOW, len(observed_revenue))
    recent = observed_revenue[-window:]

    robust_recent = _robust_clip(recent)

    selling_day_baseline = max(
        0.0,
        _safe_float(_weighted_average(robust_recent)),
    )

    observed_days = int(daily_slice["observed"].sum())
    calendar_days = len(daily_slice)

    sales_day_rate = (
        observed_days / calendar_days
        if calendar_days > 0
        else 0.0
    )
    sales_day_rate = float(np.clip(sales_day_rate, 0.0, 1.0))

    baseline = max(
        0.0,
        selling_day_baseline * sales_day_rate,
    )

    if len(robust_recent) >= 3:
        x = np.arange(len(robust_recent), dtype=float)
        raw_slope = float(np.polyfit(x, robust_recent, 1)[0])
    else:
        raw_slope = 0.0

    max_daily_change = max(
        baseline * MAX_DAILY_TREND_RATIO,
        MIN_DAILY_TREND,
    )

    slope = float(
        np.clip(raw_slope, -max_daily_change, max_daily_change)
    )

    if len(recent) >= 5:
        recent_mean = float(np.mean(recent))
        recent_std = float(np.std(recent, ddof=1))

        if recent_mean > 0 and np.isfinite(recent_std):
            coefficient_of_variation = recent_std / recent_mean

            if coefficient_of_variation > 1.0:
                slope *= 0.25
            elif coefficient_of_variation > 0.75:
                slope *= 0.50

    coverage = (
        observed_days / calendar_days
        if calendar_days > 0
        else 0.0
    )

    if observed_days < 7:
        slope = 0.0
    elif observed_days < 14 or coverage < 0.50:
        slope *= 0.20
    elif observed_days < 30:
        slope *= 0.50

    weekday_seasonality = _legacy_weekday_seasonality(daily_slice)
    seasonal_factor = weekday_seasonality.get(target_weekday, 1.0)

    trend_value = max(0.0, baseline + slope)
    predicted = max(0.0, trend_value * seasonal_factor)

    minimum_error = max(
        baseline * 0.10,
        selling_day_baseline * max(0.10, 1.0 - sales_day_rate),
        1.0,
    )

    seasonal_baseline = baseline * seasonal_factor

    max_forecast = max(
        seasonal_baseline * 1.50,
        seasonal_baseline + minimum_error,
    )

    min_forecast = max(0.0, seasonal_baseline * 0.50)

    predicted = float(
        np.clip(predicted, min_forecast, max_forecast)
    )

    return predicted


# =========================================================
# ORDER BASELINE (V3)
# =========================================================

def _calculate_order_baseline(daily):
    """
    Forecast order demand independently from revenue.
    """

    if (
        daily is None
        or len(daily) == 0
        or "orders" not in daily.columns
    ):
        return None

    observed = daily[
        daily["observed"].astype(bool)
    ].copy()

    if observed.empty:
        return None

    observed["orders"] = pd.to_numeric(
        observed["orders"],
        errors="coerce",
    ).fillna(0)

    observed["orders"] = (
        observed["orders"]
        .clip(lower=0)
    )

    recent = observed.tail(
        min(
            BASELINE_WINDOW,
            len(observed),
        )
    )

    if recent.empty:
        return None

    values = recent[
        "orders"
    ].to_numpy(dtype=float)

    # Robust clipping for order-count spikes.
    if len(values) >= 5:
        values = _winsorize_revenue(
            values
        )

    weights = np.arange(
        1,
        len(values) + 1,
        dtype=float,
    )

    weights /= weights.sum()

    baseline = float(
        np.sum(
            values * weights
        )
    )

    return max(
        MIN_ORDER_FORECAST,
        baseline,
    )


# =========================================================
# LAG / ROLLING / TREND FEATURES (V4.1)
# =========================================================

def _extract_v41_features(daily_slice):
    """
    Compute recency features from a daily history slice:
    lag-1/lag-7 values, 7-day rolling averages, and
    constrained recent-vs-previous-7-day trend ratios for
    revenue, orders, and AOV, plus a spike-regime damping
    factor.

    IMPORTANT: this only ever looks at rows already present in
    daily_slice. When called from the rolling backtest with a
    training slice (daily.iloc[:index]), the target day itself
    is never included, so there is no look-ahead leakage.
    """

    features = {
        "revenueLag1": None,
        "revenueLag7": None,
        "ordersLag1": None,
        "ordersLag7": None,
        "aovLag1": None,
        "aovLag7": None,
        "revenueRolling7": None,
        "ordersRolling7": None,
        "aovRolling7": None,
        "revenueTrend": 1.0,
        "orderTrend": 1.0,
        "aovTrend": 1.0,
        "recentAov": None,
        "previousAov": None,
        "spikeCountRecent": 0,
        "spikeRegimeDamping": SPIKE_DAMPING_SPARSE,
    }

    if daily_slice is None or len(daily_slice) == 0:
        return features

    frame = daily_slice.copy()

    frame["revenue"] = pd.to_numeric(
        frame["revenue"], errors="coerce"
    ).fillna(0.0)

    frame["orders"] = pd.to_numeric(
        frame["orders"], errors="coerce"
    ).fillna(0.0)

    frame["observed"] = frame["observed"].astype(bool)

    revenue = frame["revenue"].to_numpy(dtype=float)
    orders = frame["orders"].to_numpy(dtype=float)

    n = len(frame)

    # ---------------------------------------------------------
    # SALES-AWARE LAG / ROLLING FEATURES
    # ---------------------------------------------------------
    # Do not treat zero-filled/unobserved calendar rows as
    # genuine zero-demand observations.
    #
    # For demand/revenue signals, use observed sales days.
    # This prevents sparse calendar data from forcing the
    # trend toward zero.
    observed_frame = frame[frame["observed"]].copy()

    if len(observed_frame) >= 1:
        observed_revenue = pd.to_numeric(
            observed_frame["revenue"], errors="coerce"
        ).fillna(0.0)

        observed_orders = pd.to_numeric(
            observed_frame["orders"], errors="coerce"
        ).fillna(0.0)

        # Most recent genuine observed sales day
        features["revenueLag1"] = float(observed_revenue.iloc[-1])
        features["ordersLag1"] = float(observed_orders.iloc[-1])

        # Seven most recent genuine observed sales days
        if len(observed_frame) >= 7:
            features["revenueLag7"] = float(observed_revenue.iloc[-7])
            features["ordersLag7"] = float(observed_orders.iloc[-7])

        # Rolling average over recent observed sales days
        rolling_n = min(7, len(observed_frame))
        features["revenueRolling7"] = float(
            observed_revenue.tail(rolling_n).mean()
        )
        features["ordersRolling7"] = float(
            observed_orders.tail(rolling_n).mean()
        )

    # ---- Daily AOV series (observed days with orders > 0 only) ----
    observed_mask = frame["observed"].to_numpy()
    aov_valid = observed_mask & (orders > 0)

    safe_orders = np.where(orders == 0, np.nan, orders)
    daily_aov = np.where(aov_valid, revenue / safe_orders, np.nan)
    aov_series = daily_aov[~np.isnan(daily_aov)]

    if len(aov_series) >= 1:
        features["aovLag1"] = float(aov_series[-1])

    if len(aov_series) >= 8:
        features["aovLag7"] = float(aov_series[-8])

    if len(aov_series) >= 2:
        aov_tail_n = min(7, len(aov_series))
        features["aovRolling7"] = float(np.mean(aov_series[-aov_tail_n:]))

    # ---------------------------------------------------------
    # SALES-AWARE RECENT VS PREVIOUS TREND
    # ---------------------------------------------------------
    # Compare genuine observed sales days rather than calendar
    # rows. This prevents zero-filled dates from being treated
    # as demand collapse.
    if len(observed_frame) >= TREND_MIN_HISTORY_DAYS:
        observed_revenue = (
            pd.to_numeric(observed_frame["revenue"], errors="coerce")
            .fillna(0.0)
            .to_numpy(dtype=float)
        )

        observed_orders = (
            pd.to_numeric(observed_frame["orders"], errors="coerce")
            .fillna(0.0)
            .to_numpy(dtype=float)
        )

        recent_revenue_sum = float(np.sum(observed_revenue[-7:]))
        previous_revenue_sum = float(np.sum(observed_revenue[-14:-7]))

        if previous_revenue_sum > 0:
            features["revenueTrend"] = float(
                np.clip(
                    recent_revenue_sum / previous_revenue_sum,
                    TREND_LOWER,
                    TREND_UPPER,
                )
            )

        recent_orders_sum = float(np.sum(observed_orders[-7:]))
        previous_orders_sum = float(np.sum(observed_orders[-14:-7]))

        if previous_orders_sum > 0:
            features["orderTrend"] = float(
                np.clip(
                    recent_orders_sum / previous_orders_sum,
                    TREND_LOWER,
                    TREND_UPPER,
                )
            )

    if len(aov_series) >= TREND_MIN_HISTORY_DAYS:
        recent_aov = float(np.mean(aov_series[-7:]))
        previous_aov = float(np.mean(aov_series[-14:-7]))

        features["recentAov"] = recent_aov
        features["previousAov"] = previous_aov

        if previous_aov > 0:
            features["aovTrend"] = float(
                np.clip(
                    recent_aov / previous_aov,
                    AOV_TREND_LOWER,
                    AOV_TREND_UPPER,
                )
            )
    elif len(aov_series) >= 4:
        # Not enough history for a recent-vs-previous split, but
        # still expose a recent average for the AOV blend.
        aov_tail_n = min(7, len(aov_series))
        features["recentAov"] = float(np.mean(aov_series[-aov_tail_n:]))

    # ---- Spike regime damping ----
    # (observed_frame already computed above for the sales-aware
    # lag/rolling/trend features; reused here.)
    if len(observed_frame) >= 5:
        recent_observed = observed_frame.tail(SPIKE_REGIME_WINDOW)

        spike_mask = _detect_revenue_spikes(
            recent_observed["revenue"].to_numpy(dtype=float)
        )

        spike_count = int(spike_mask.sum())
        features["spikeCountRecent"] = spike_count

        if spike_count >= 2:
            # Repeated spikes -> treat as a potential demand
            # regime change, allow more of the trend through.
            features["spikeRegimeDamping"] = SPIKE_DAMPING_REPEATED
        elif spike_count == 1:
            # A single abnormal transaction -> don't let it
            # swing the trend-adjusted forecast much.
            features["spikeRegimeDamping"] = SPIKE_DAMPING_SINGLE
        else:
            features["spikeRegimeDamping"] = SPIKE_DAMPING_NONE
    else:
        features["spikeRegimeDamping"] = SPIKE_DAMPING_SPARSE

    return features


def _v41_recency_adjustment(lag1, lag7, rolling7, weight, lower, upper):
    """
    Bounded, small-magnitude adjustment comparing the most recent
    lag-1/lag-7 observations against the 7-day rolling average.

    This is deliberately a minor nudge (see `weight`/`lower`/
    `upper`), not a second trend model -- the 14-day recent-vs-
    previous trend ratio (orderTrend/aovTrend) already does that
    job. It exists so lag1/lag7/rolling7 actually participate in
    the prediction instead of only being exposed as diagnostics.

    Returns 1.0 (no-op) if there isn't enough data to compute it.
    """

    reference_points = [
        value for value in (lag1, lag7) if value is not None
    ]

    if not reference_points or rolling7 is None or rolling7 <= 0:
        return 1.0

    short_term_reference = sum(reference_points) / len(reference_points)

    if short_term_reference <= 0:
        return 1.0

    raw_ratio = short_term_reference / rolling7
    blended = 1.0 + weight * (raw_ratio - 1.0)

    return float(np.clip(blended, lower, upper))


def _v41_revenue_trend_calibration(predicted_aov, reported_orders, features):
    """
    Bounded cross-check that nudges predicted AOV toward what
    revenueLag1 / revenueLag7 / revenueRolling7 / revenueTrend
    independently suggest revenue should be.

    This adjusts AOV rather than revenue directly, so the
    predictedOrders x predictedAOV = predictedRevenue invariant
    still holds exactly by construction -- it never touches
    predictedRevenue as a separate number. The adjustment is
    clipped to REVENUE_CALIBRATION_LOWER/UPPER so a disagreement
    between the orders x AOV path and the revenue-series signal
    can't swing the forecast by more than a few percent.
    """

    if reported_orders <= 0:
        return predicted_aov

    revenue_trend = features.get("revenueTrend", 1.0)

    reference_points = [
        value
        for value in (
            features.get("revenueLag1"),
            features.get("revenueLag7"),
            features.get("revenueRolling7"),
        )
        if value is not None and value > 0
    ]

    if not reference_points:
        return predicted_aov

    reference_revenue = (
        sum(reference_points) / len(reference_points)
    ) * revenue_trend

    reference_aov = reference_revenue / reported_orders

    if reference_aov <= 0:
        return predicted_aov

    ratio = reference_aov / predicted_aov
    calibration = 1.0 + REVENUE_CALIBRATION_WEIGHT * (ratio - 1.0)
    calibration = float(
        np.clip(calibration, REVENUE_CALIBRATION_LOWER, REVENUE_CALIBRATION_UPPER)
    )

    calibrated_aov = predicted_aov * calibration

    return max(MIN_AOV, calibrated_aov)


# ---------------------------------------------------------
# V4.1 normal-day calibration (V4.1 revision, not a new model
# version). Backtest evidence showed V4.1's orders x AOV
# pipeline overpredicting on ordinary/sparse-order days (e.g.
# error 100%+ against a ~5% baseline error on comparable days)
# while genuinely beating both V4 and the baseline on days with
# strong, corroborated high-AOV demand.
#
# This does NOT add a new feature set. It reuses the signals
# _extract_v41_features already computes -- spikeRegimeDamping /
# spikeCountRecent, recentAov relative to the historical
# baseline AOV, and orderTrend/aovTrend -- to classify each day
# into one of two regimes, then applies a small, bounded
# multiplicative pull-back on ordinary days only. The multiplier
# is applied to predicted AOV (not revenue directly), so
# predictedOrders x predictedAOV = predictedRevenue continues to
# hold exactly, the same pattern already used by
# _v41_revenue_trend_calibration above.
# ---------------------------------------------------------

# Conservative starting damping for ordinary/sparse-order days.
# Deliberately mild (0.80-0.90 range) rather than a large
# correction, per the calibration plan.
NORMAL_DAY_DAMPING = 0.85

# A "legitimate" spike regime requires the existing repeated-
# spike signal (spikeRegimeDamping == SPIKE_DAMPING_REPEATED)
# to be corroborated by independent recent-AOV or demand-trend
# evidence, so a single noisy high-AOV day cannot alone
# masquerade as a genuine regime change.
SPIKE_REGIME_AOV_RATIO = 1.15
SPIKE_REGIME_TREND_FLOOR = 1.10

# Order-count growth ratio (reported orders vs the order
# baseline) used as the "order count" signal for corroborating
# demand-side spike evidence, alongside orderTrend.
SPIKE_REGIME_ORDER_GROWTH_FLOOR = 1.05


def _v41_is_legitimate_spike_regime(
    base_aov,
    reported_orders,
    order_baseline,
    features,
):
    """
    Classify whether the current day's V4.1 features indicate a
    genuine, corroborated demand/price spike regime, as opposed
    to an ordinary day where a single recent spike or noisy AOV
    reading should not be allowed to inflate the forecast.

    Reuses spikeRegimeDamping / spikeCountRecent (repeated-spike
    detection), recentAov vs the historical baseline AOV, and
    orderTrend / order-count growth -- all already computed by
    _extract_v41_features. No new lag/rolling features.
    """

    damping_level = features.get(
        "spikeRegimeDamping", SPIKE_DAMPING_SPARSE
    )

    repeated_spikes = damping_level == SPIKE_DAMPING_REPEATED

    if not repeated_spikes:
        return False

    recent_aov = features.get("recentAov")
    aov_trend = features.get("aovTrend", 1.0)
    order_trend = features.get("orderTrend", 1.0)

    aov_evidence = (
        recent_aov is not None
        and base_aov > 0
        and recent_aov >= base_aov * SPIKE_REGIME_AOV_RATIO
        and aov_trend >= SPIKE_REGIME_TREND_FLOOR
    )

    order_growth_ratio = (
        reported_orders / order_baseline
        if order_baseline and order_baseline > 0
        else 1.0
    )

    demand_evidence = (
        order_trend >= SPIKE_REGIME_TREND_FLOOR
        or order_growth_ratio >= SPIKE_REGIME_ORDER_GROWTH_FLOOR
    )

    # Repeated spikes alone are not enough -- require at least
    # one independent corroborating signal (elevated AOV or
    # elevated demand) before treating this as a legitimate
    # spike regime rather than an ordinary day.
    return aov_evidence or demand_evidence


def _v41_normal_day_calibration(
    predicted_aov,
    base_aov,
    reported_orders,
    order_baseline,
    features,
):
    """
    Bounded post-hoc calibration applied to V4.1's already-
    computed AOV estimate, after the trend/recency/revenue-
    calibration adjustments above.

        legitimate, corroborated spike regime -> multiplier 1.0
        ordinary / sparse-order day             -> NORMAL_DAY_DAMPING

    Applied to AOV rather than revenue directly so
    predictedOrders x predictedAOV = predictedRevenue continues
    to hold exactly.
    """

    if reported_orders <= 0:
        return predicted_aov

    legitimate_spike = _v41_is_legitimate_spike_regime(
        base_aov,
        reported_orders,
        order_baseline,
        features,
    )

    multiplier = (
        1.0
        if legitimate_spike
        else NORMAL_DAY_DAMPING
    )

    return max(MIN_AOV, predicted_aov * multiplier)


def _v41_predicted_orders(order_baseline, order_weekday_factor, features):
    """
    orders x AOV weekday-interaction order component:

        predicted_orders =
            base_orders x trend_factor x weekday_factor x recency_adj

    The order trend is dampened according to the spike-regime
    check before being applied, and the existing MAX_ORDER_GROWTH
    safeguard is re-applied on top of the trend-adjusted baseline
    (not the raw baseline) so growth headroom scales with the
    detected trend instead of silently clipping it away.

    `recency_adj` is a small, tightly-bounded nudge from
    ordersLag1/ordersLag7 vs ordersRolling7 (see
    `_v41_recency_adjustment`) -- it's what makes the lag/rolling
    features genuinely feature-driven rather than diagnostic-only.
    """

    order_baseline = max(0.0, _safe_float(order_baseline))
    order_weekday_factor = _safe_float(order_weekday_factor, 1.0)

    damping = features.get("spikeRegimeDamping", SPIKE_DAMPING_SPARSE)
    order_trend = features.get("orderTrend", 1.0)

    damped_trend = 1.0 + damping * (order_trend - 1.0)
    damped_trend = max(0.0, damped_trend)

    trended_baseline = order_baseline * damped_trend

    recency_adj = _v41_recency_adjustment(
        features.get("ordersLag1"),
        features.get("ordersLag7"),
        features.get("ordersRolling7"),
        RECENCY_ADJ_WEIGHT_ORDERS,
        RECENCY_ADJ_LOWER,
        RECENCY_ADJ_UPPER,
    )

    predicted = trended_baseline * order_weekday_factor * recency_adj

    predicted = max(MIN_ORDER_FORECAST, predicted)

    predicted = min(
        predicted,
        trended_baseline * (1.0 + MAX_ORDER_GROWTH),
    )

    return predicted


def _v41_predicted_aov(base_aov, weekday_aov_factor, features):
    """
    AOV baseline + 7-day AOV average + AOV trend + weekday AOV
    factor, blended per the V4.1 spec:

        predicted_AOV =
            weighted(historical_AOV, recent_7_day_AOV, previous_7_day_AOV)
            x weekday_AOV_factor x recency_adj

    with the AOV trend applied (dampened by the same spike-regime
    check as orders) and the existing MIN_AOV / MAX_AOV_MULTIPLIER
    safeguards enforced relative to the historical baseline AOV.

    `recency_adj` is a small, tightly-bounded nudge from
    aovLag1/aovLag7 vs aovRolling7 (see `_v41_recency_adjustment`).
    """

    base_aov = max(MIN_AOV, _safe_float(base_aov, MIN_AOV))
    weekday_aov_factor = _safe_float(weekday_aov_factor, 1.0)

    recent_aov = features.get("recentAov")
    previous_aov = features.get("previousAov")

    components = [(base_aov, AOV_WEIGHT_HISTORICAL)]
    components.append(
        (recent_aov if recent_aov is not None else base_aov, AOV_WEIGHT_RECENT_7)
    )
    components.append(
        (previous_aov if previous_aov is not None else base_aov, AOV_WEIGHT_PREVIOUS_7)
    )

    total_weight = sum(weight for _, weight in components)

    blended_aov = (
        sum(value * weight for value, weight in components) / total_weight
        if total_weight > 0
        else base_aov
    )

    damping = features.get("spikeRegimeDamping", SPIKE_DAMPING_SPARSE)
    aov_trend = features.get("aovTrend", 1.0)

    damped_aov_trend = 1.0 + damping * (aov_trend - 1.0)
    damped_aov_trend = max(0.0, damped_aov_trend)

    recency_adj = _v41_recency_adjustment(
        features.get("aovLag1"),
        features.get("aovLag7"),
        features.get("aovRolling7"),
        RECENCY_ADJ_WEIGHT_AOV,
        AOV_RECENCY_ADJ_LOWER,
        AOV_RECENCY_ADJ_UPPER,
    )

    predicted = blended_aov * damped_aov_trend * weekday_aov_factor * recency_adj

    predicted = max(MIN_AOV, predicted)
    predicted = min(predicted, base_aov * MAX_AOV_MULTIPLIER)

    return predicted


# =========================================================
# METRICS
# =========================================================

def _calculate_zero_safe_mape(actual, predicted):
    """
    Calculate MAPE only where actual revenue is non-zero.

    Returns None if there are no non-zero observations.
    """

    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)

    mask = np.abs(actual) > 1e-9

    if not np.any(mask):
        return None

    percentage_errors = (
        np.abs(actual[mask] - predicted[mask])
        / np.abs(actual[mask])
    )

    return float(np.mean(percentage_errors) * 100)


def _calculate_wape(actual, predicted):
    """
    Weighted Absolute Percentage Error.

    Unlike MAPE, this does not explode when individual
    observations are zero, which makes it far more useful
    for sparse sales data with many no-sale days.
    """

    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)

    denominator = np.sum(np.abs(actual))

    if denominator == 0:
        return None

    return float(
        np.sum(np.abs(actual - predicted))
        / denominator
        * 100
    )


def _calculate_smape(actual, predicted):
    """
    Symmetric MAPE.

    Bounded between 0% and 200%, and defined even when
    actual is zero (as long as predicted isn't also zero),
    which makes it another useful complement to WAPE.
    """

    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)

    denominator = np.abs(actual) + np.abs(predicted)

    mask = denominator > 1e-9

    if not np.any(mask):
        return None

    ratios = (
        np.abs(actual[mask] - predicted[mask])
        / denominator[mask]
    )

    return float(np.mean(ratios) * 200)


# =========================================================
# DAILY HISTORY PREPARATION
# =========================================================

def _prepare_daily_history(history):
    """
    Convert forecast history into a continuous daily time series.

    Supports:
    - Pydantic/model objects
    - Plain dictionaries

    Each input record represents revenue for a calendar date.
    Duplicate dates are aggregated.
    Missing calendar dates are inserted with zero revenue
    and observed=False.
    """

    if not history:
        raise ValueError(
            "Forecast history cannot be empty."
        )

    rows = []

    # ---------------------------------------------------------
    # NORMALIZE INPUT RECORDS
    # ---------------------------------------------------------

    for item in history:

        # Support both Pydantic/model objects and dictionaries.
        if isinstance(item, dict):
            item_date = item.get("date")
            item_revenue = item.get("revenue")
            item_orders = item.get("orders", 0)
            raw_observed = item.get("observed")
        else:
            item_date = getattr(item, "date", None)
            item_revenue = getattr(item, "revenue", None)
            item_orders = getattr(item, "orders", 0)
            raw_observed = getattr(item, "observed", None)

        revenue_value = _safe_float(item_revenue)

        orders_value = max(
            0,
            int(_safe_float(item_orders))
        )

        # If observed is explicitly provided, preserve it.
        # Otherwise infer an observed day from positive revenue.
        if raw_observed is None:
            observed_value = revenue_value > 0
        else:
            observed_value = bool(raw_observed)

        rows.append(
            {
                "date": item_date,
                "revenue": revenue_value,
                "orders": orders_value,
                "observed": observed_value,
            }
        )

    # ---------------------------------------------------------
    # CREATE DATAFRAME
    # ---------------------------------------------------------

    df = pd.DataFrame(rows)

    if df.empty:
        raise ValueError(
            "No historical revenue data was supplied."
        )

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce",
    )

    df["revenue"] = pd.to_numeric(
        df["revenue"],
        errors="coerce",
    )

    df = df.dropna(
        subset=["date", "revenue"]
    )

    if df.empty:
        raise ValueError(
            "No valid historical revenue data was supplied."
        )

    df["revenue"] = df["revenue"].clip(
        lower=0
    )

    # ---------------------------------------------------------
    # AGGREGATE DUPLICATE CALENDAR DATES
    # ---------------------------------------------------------

    df = (
        df.groupby(
            "date",
            as_index=False,
        )
        .agg(
            revenue=("revenue", "sum"),
            orders=("orders", "sum"),
            observed=("observed", "max"),
        )
        .sort_values("date")
    )

    # ---------------------------------------------------------
    # CONTINUOUS DAILY SERIES
    # ---------------------------------------------------------

    daily = (
        df.set_index("date")
        .asfreq("D")
    )

    # Dates that were not supplied by the backend are
    # considered unobserved calendar days.
    daily["observed"] = (
        daily["observed"]
        .fillna(False)
        .astype(bool)
    )

    # Missing calendar dates receive zero revenue.
    daily["revenue"] = (
        pd.to_numeric(
            daily["revenue"],
            errors="coerce",
        )
        .fillna(0)
        .clip(lower=0)
    )

    # Missing calendar dates receive zero orders.
    daily["orders"] = (
        pd.to_numeric(
            daily["orders"],
            errors="coerce",
        )
        .fillna(0)
        .clip(lower=0)
    )

    return daily

# =========================================================
# FORECAST GENERATION
# =========================================================

def generate_sales_forecast(history, horizon_days: int):
    """
    Generate a sales-revenue forecast using the V4 model.

    Strategy:

    1. Convert history into a continuous daily series.
    2. Forecast order demand and a base average order value (AOV)
       independently, using robust, spike-resistant estimators.
    3. Let AOV vary by weekday via a heavily-shrunk factor, since
       daily revenue is noisy even when order counts barely move.
    4. Combine them (orders x AOV x AOV-weekday-factor) into the
       revenue forecast -- this is the single authoritative
       revenue equation.
    5. Apply conservative, shrunk weekday seasonality to orders.
    6. Generate a residual-based prediction interval, excluding
       detected revenue spikes from the error estimate.
    7. Run a genuine one-step-ahead rolling backtest (recomputing
       AOV, order baseline, and both weekday factors from the
       training slice only, with no look-ahead), and compare
       against the legacy "robust-weighted-moving-average" model.
    """

    if not history:
        raise ValueError(
            "Forecast history cannot be empty."
        )

    try:
        horizon_days = int(horizon_days)
    except (TypeError, ValueError):
        raise ValueError(
            "horizon_days must be a valid integer."
        )

    if horizon_days < 1:
        raise ValueError(
            "horizon_days must be at least 1."
        )

    daily = _prepare_daily_history(history)

    revenue = daily["revenue"].astype(float)

    if len(revenue) < MIN_HISTORY_POINTS:
        raise ValueError(
            f"At least {MIN_HISTORY_POINTS} daily "
            "history points are required for forecasting."
        )

    observed_mask = daily["observed"].astype(bool)

    observed_revenue = (
        revenue.loc[observed_mask]
        .to_numpy(dtype=float)
    )

    if len(observed_revenue) == 0:
        raise ValueError(
            "No observed sales days are available for forecasting."
        )

    production_spike_mask = _detect_revenue_spikes(
        observed_revenue
    )
    print("\n========== REVENUE SPIKE DIAGNOSTICS ==========")
    print("Observed revenue days:", len(observed_revenue))
    print("Detected spike days:", int(production_spike_mask.sum()))
    print(
        "Max observed revenue:",
        float(np.max(observed_revenue))
    )
    print(
        "Median observed revenue:",
        float(np.median(observed_revenue))
    )
    print(
        "Spike revenues:",
        observed_revenue[production_spike_mask].tolist()
    )
    print("===============================================\n")

    window = min(
        BASELINE_WINDOW,
        len(observed_revenue),
    )

    recent = observed_revenue[-window:]

    # -----------------------------------------------------
    # V3: ORDERS x AOV MODEL
    # -----------------------------------------------------

    order_baseline = (
        _calculate_order_baseline(daily)
    )

    aov = _calculate_aov(daily)

    weekday_seasonality = (
        _calculate_weekday_seasonality(daily)
    )

    aov_weekday_factor = (
        _calculate_weekday_aov_factor(daily)
    )

    if aov is None:
        aov = _log_robust_baseline(
            recent
        )

    if order_baseline is None:
        order_baseline = 0.0

    # -----------------------------------------------------
    # V4.1: LAG / ROLLING / TREND FEATURES
    # -----------------------------------------------------
    #
    # Computed once from the full history for the future
    # forecast horizon below (the "current regime" is assumed
    # to hold across the horizon). The rolling backtest instead
    # recomputes this per training slice -- see below.

    v41_features = _extract_v41_features(daily)

    # -----------------------------------------------------
    # HISTORICAL ERROR ESTIMATION (for confidence interval)
    # -----------------------------------------------------
    #
    # Reconstruct each historical day using the same dynamic
    # (orders x AOV x AOV-weekday-factor) model the forecast
    # itself uses, then exclude detected revenue spikes before
    # measuring dispersion. Without excluding spikes, a single
    # exceptional day inflates error_std enough to blow the
    # confidence interval's lower bound down toward zero and
    # the upper bound up toward implausible highs.

    daily_weekday = daily.index.weekday

    aov_factor_by_day = np.array(
        [
            aov_weekday_factor.get(int(w), 1.0)
            for w in daily_weekday
        ],
        dtype=float,
    )

    historical_predicted = (
        daily["orders"].astype(float).to_numpy(dtype=float)
        * aov
        * aov_factor_by_day
    )

    historical_actual = (
        daily["revenue"].astype(float).to_numpy(dtype=float)
    )

    observed_mask_full = (
        daily["observed"].astype(bool).to_numpy()
    )

    spike_mask_full = np.zeros(
        len(daily),
        dtype=bool,
    )

    if observed_mask_full.any():
        spike_mask_full[observed_mask_full] = (
            _detect_revenue_spikes(
                historical_actual[observed_mask_full]
            )
        )

    residuals = (
        historical_actual
        - historical_predicted
    )

    residuals = residuals[
        ~spike_mask_full
        & np.isfinite(residuals)
    ]

    if len(residuals) >= 2:
        error_std = float(
            np.std(
                residuals,
                ddof=1,
            )
        )
    else:
        error_std = (
            max(aov * 0.25, 1.0)
        )

    error_std = max(
        error_std,
        aov * 0.10,
        1.0,
    )

    # -----------------------------------------------------
    # GENERATE FUTURE FORECAST
    # -----------------------------------------------------

    last_date = daily.index[-1]

    forecast = []

    for day in range(
        1,
        horizon_days + 1,
    ):
        forecast_date = (
            last_date
            + timedelta(days=day)
        )

        weekday = forecast_date.weekday()

        seasonal_factor = (
            weekday_seasonality.get(
                weekday,
                1.0,
            )
        )

        predicted_orders = (
            order_baseline
            * seasonal_factor
        )

        predicted_orders = max(
            MIN_ORDER_FORECAST,
            predicted_orders,
        )

        predicted_orders = min(
            predicted_orders,
            order_baseline
            * (1.0 + MAX_ORDER_GROWTH),
        )

        # Orders are reported as whole transactions.
        # Keep the statistical expectation fractional internally.
        expected_orders = max(
            0.0,
            float(predicted_orders),
        )

        # Orders shown to users are whole transactions.
        reported_orders = max(
            0,
            int(round(expected_orders)),
        )

        predicted_aov = (
            aov
            * aov_weekday_factor.get(
                weekday,
                1.0,
            )
        )

        # Revenue must use the same order count exposed
        # by the API so that:
        #
        # predictedOrders × predictedAOV = predictedRevenue
        #
        # expectedOrders remains available separately as the
        # continuous statistical estimate, but must not be used
        # here or predictedRevenue will not reconcile with the
        # predictedOrders value actually returned to the caller.
        predicted_revenue_v4 = (
            reported_orders
            * predicted_aov
        )

        # ---------------------------------------------------
        # V4.1: trend- and weekday-interaction-adjusted orders
        # and AOV, built on top of the same order/AOV baselines.
        # ---------------------------------------------------

        predicted_orders_v41 = _v41_predicted_orders(
            order_baseline,
            seasonal_factor,
            v41_features,
        )

        expected_orders_v41 = max(0.0, float(predicted_orders_v41))

        reported_orders_v41 = max(
            0,
            int(round(expected_orders_v41)),
        )

        predicted_aov_v41 = _v41_predicted_aov(
            aov,
            aov_weekday_factor.get(weekday, 1.0),
            v41_features,
        )

        # Revenue-trend calibration: nudges predicted AOV (not
        # revenue) toward what revenueLag1/revenueLag7/
        # revenueRolling7/revenueTrend independently suggest, so
        # the orders x AOV = revenue reconciliation below still
        # holds exactly.
        predicted_aov_v41 = _v41_revenue_trend_calibration(
            predicted_aov_v41,
            reported_orders_v41,
            v41_features,
        )

        # Normal-day calibration: dampen ordinary/sparse-order
        # days, preserve corroborated spike-regime days. See
        # _v41_normal_day_calibration for details.
        predicted_aov_v41 = _v41_normal_day_calibration(
            predicted_aov_v41,
            aov,
            reported_orders_v41,
            order_baseline,
            v41_features,
        )

        # Same reconciliation rule as V4: reported (whole) orders
        # x predicted AOV = predicted revenue.
        predicted_revenue = (
            reported_orders_v41
            * predicted_aov_v41
        )

        uncertainty = (
            CONFIDENCE_Z
            * error_std
            * (
                1.0
                + 0.05 * (day - 1)
            )
        )

        lower = max(
            0.0,
            predicted_revenue
            - uncertainty,
        )

        upper = (
            predicted_revenue
            + uncertainty
        )

        forecast.append(
            {
                "date": forecast_date.strftime(
                    "%Y-%m-%d"
                ),
                "predictedRevenue": round(
                    predicted_revenue,
                    2,
                ),
                "predictedOrders": reported_orders_v41,
                "expectedOrders": round(
                    expected_orders_v41,
                    4,
                ),
                "predictedAOV": round(
                    predicted_aov_v41,
                    2,
                ),
                "lowerBound": round(
                    lower,
                    2,
                ),
                "upperBound": round(
                    upper,
                    2,
                ),
                # Legacy V4 numbers, retained for transparency /
                # side-by-side comparison during the viva. Not
                # used in lowerBound/upperBound, which are built
                # around the V4.1 (primary) prediction.
                "legacyV4PredictedRevenue": round(
                    predicted_revenue_v4,
                    2,
                ),
                "legacyV4PredictedOrders": reported_orders,
                "legacyV4PredictedAOV": round(
                    predicted_aov,
                    2,
                ),
            }
        )

    # -----------------------------------------------------
    # ROLLING BACKTEST (V3 vs legacy baseline model)
    # -----------------------------------------------------
    #
    # For every test day:
    #
    #   training data
    #        |
    #   calculate AOV
    #        |
    #   calculate order baseline
    #        |
    #   calculate weekday factors
    #        |
    #   predict next day
    #        |
    #   compare against actual
    #
    # Do not evaluate V3 against the full-history fitted model.
    # -----------------------------------------------------

    mae = None
    rmse = None
    mape = None
    wape = None
    smape = None
    evaluation_days = 0
    baseline_wape = None
    improvement_percent = None

    start_index = max(
        MIN_HISTORY_POINTS,
        len(daily) - EVALUATION_CALENDAR_DAYS,
    )

    actual_values = []
    predicted_values = []
    v4_legacy_predicted_values = []
    baseline_predicted_values = []

    # TEMPORARY DIAGNOSTIC: per-day backtest records used to
    # investigate the V4 vs baseline WAPE gap. Not intended to be
    # permanent -- remove once the root cause is identified and
    # addressed (see sales-forecast-v4.1 follow-up).
    evaluation_details = []

    for index in range(
        start_index,
        len(daily),
    ):
        training = daily.iloc[:index].copy()
        actual_row = daily.iloc[index]

        # Only evaluate against genuine observed sales days --
        # zero-filled calendar days are useful for forecasting
        # but should not be treated as accuracy observations.
        if not bool(actual_row["observed"]):
            continue

        training_aov = _calculate_aov(
            training
        )

        training_orders = (
            _calculate_order_baseline(
                training
            )
        )

        training_seasonality = (
            _calculate_weekday_seasonality(
                training
            )
        )

        training_aov_weekday_factor = (
            _calculate_weekday_aov_factor(
                training
            )
        )

        if (
            training_aov is None
            or training_orders is None
        ):
            continue

        weekday = (
            daily.index[index].weekday()
        )

        factor = training_seasonality.get(
            weekday,
            1.0,
        )

        new_orders = (
            training_orders
            * factor
        )

        new_orders = max(
            MIN_ORDER_FORECAST,
            new_orders,
        )

        new_orders = min(
            new_orders,
            training_orders
            * (1.0 + MAX_ORDER_GROWTH),
        )

        reported_training_orders = max(
            0,
            int(round(new_orders)),
        )

        training_predicted_aov = (
            training_aov
            * training_aov_weekday_factor.get(
                weekday,
                1.0,
            )
        )

        new_revenue = (
            reported_training_orders
            * training_predicted_aov
        )

        # ---------------------------------------------------
        # V4.1: recompute lag/rolling/trend features from the
        # training slice only (no look-ahead), then predict.
        # ---------------------------------------------------

        training_v41_features = _extract_v41_features(training)

        new_orders_v41 = _v41_predicted_orders(
            training_orders,
            factor,
            training_v41_features,
        )

        reported_orders_v41 = max(
            0,
            int(round(new_orders_v41)),
        )

        new_aov_v41 = _v41_predicted_aov(
            training_aov,
            training_aov_weekday_factor.get(weekday, 1.0),
            training_v41_features,
        )

        new_aov_v41 = _v41_revenue_trend_calibration(
            new_aov_v41,
            reported_orders_v41,
            training_v41_features,
        )

        # Normal-day calibration: dampen ordinary/sparse-order
        # days, preserve corroborated spike-regime days. See
        # _v41_normal_day_calibration for details.
        new_aov_v41 = _v41_normal_day_calibration(
            new_aov_v41,
            training_aov,
            reported_orders_v41,
            training_orders,
            training_v41_features,
        )

        new_revenue_v41 = (
            reported_orders_v41
            * new_aov_v41
        )

        baseline_prediction = (
            _legacy_next_day_prediction(
                training,
                weekday,
            )
        )

        actual = float(
            actual_row["revenue"]
        )

        actual_values.append(actual)

        predicted_values.append(
            new_revenue_v41
        )

        v4_legacy_predicted_values.append(
            new_revenue
        )

        baseline_predicted_values.append(
            baseline_prediction
        )

        # TEMPORARY DIAGNOSTIC: per-day error breakdown.
        v4_error = abs(actual - new_revenue)
        v4_1_error = abs(actual - new_revenue_v41)
        baseline_error = abs(actual - baseline_prediction)

        v4_error_pct = (
            (v4_error / abs(actual)) * 100
            if actual != 0
            else None
        )

        v4_1_error_pct = (
            (v4_1_error / abs(actual)) * 100
            if actual != 0
            else None
        )

        baseline_error_pct = (
            (baseline_error / abs(actual)) * 100
            if actual != 0
            else None
        )

        evaluation_details.append({
            "date": daily.index[index].strftime("%Y-%m-%d"),
            "weekday": daily.index[index].day_name(),
            "actualRevenue": round(actual, 2),
            "v4Prediction": round(new_revenue, 2),
            "v4_1Prediction": round(new_revenue_v41, 2),
            "baselinePrediction": round(baseline_prediction, 2),
            "v4AbsoluteError": round(v4_error, 2),
            "v4_1AbsoluteError": round(v4_1_error, 2),
            "baselineAbsoluteError": round(baseline_error, 2),
            "v4ErrorPercent": (
                round(v4_error_pct, 2)
                if v4_error_pct is not None
                else None
            ),
            "v4_1ErrorPercent": (
                round(v4_1_error_pct, 2)
                if v4_1_error_pct is not None
                else None
            ),
            "baselineErrorPercent": (
                round(baseline_error_pct, 2)
                if baseline_error_pct is not None
                else None
            ),
            "orders": int(actual_row["orders"]),
            "aov": (
                round(actual / actual_row["orders"], 2)
                if actual_row["orders"] > 0
                else None
            ),
            "observed": bool(actual_row["observed"]),
        })

    v4_wape = None
    v4_improvement_percent = None
    v41_improvement_over_v4_percent = None

    if actual_values:
        evaluation_days = len(actual_values)

        actual_array = np.asarray(
            actual_values,
            dtype=float,
        )

        # predicted_array / mae / rmse / mape / wape / smape below
        # are V4.1's numbers -- V4.1 is now the primary/authoritative
        # model. Legacy V4's own accuracy is tracked separately via
        # v4_wape so both can be reported alongside the baseline.
        predicted_array = np.asarray(
            predicted_values,
            dtype=float,
        )

        v4_legacy_array = np.asarray(
            v4_legacy_predicted_values,
            dtype=float,
        )

        baseline_array = np.asarray(
            baseline_predicted_values,
            dtype=float,
        )

        errors = (
            actual_array
            - predicted_array
        )

        mae = float(
            np.mean(
                np.abs(errors)
            )
        )

        rmse = float(
            np.sqrt(
                np.mean(
                    errors ** 2
                )
            )
        )

        mape = (
            _calculate_zero_safe_mape(
                actual_array,
                predicted_array,
            )
        )

        wape = _calculate_wape(
            actual_array,
            predicted_array,
        )

        smape = _calculate_smape(
            actual_array,
            predicted_array,
        )

        baseline_wape = _calculate_wape(
            actual_array,
            baseline_array,
        )

        v4_wape = _calculate_wape(
            actual_array,
            v4_legacy_array,
        )

        if (
            baseline_wape is not None
            and wape is not None
            and baseline_wape != 0
        ):
            # V4.1 improvement over baseline.
            improvement_percent = (
                (
                    baseline_wape
                    - wape
                )
                / baseline_wape
            ) * 100

        if (
            baseline_wape is not None
            and v4_wape is not None
            and baseline_wape != 0
        ):
            # V4 improvement over baseline.
            v4_improvement_percent = (
                (
                    baseline_wape
                    - v4_wape
                )
                / baseline_wape
            ) * 100

        if (
            v4_wape is not None
            and wape is not None
            and v4_wape != 0
        ):
            # V4.1 improvement over V4.
            v41_improvement_over_v4_percent = (
                (
                    v4_wape
                    - wape
                )
                / v4_wape
            ) * 100

    # -----------------------------------------------------
    # DATA QUALITY
    # -----------------------------------------------------

    calendar_days = len(daily)
    quality_observed_days = int(daily["observed"].sum())

    missing_days = max(
        0,
        calendar_days - quality_observed_days,
    )

    coverage = (
        quality_observed_days / calendar_days
        if calendar_days > 0
        else 0.0
    )

    if quality_observed_days >= 30:
        quality = "high"

    elif quality_observed_days >= 14:
        quality = "medium"

    else:
        quality = "low"

    # Confidence mirrors quality directly: don't let a
    # confident-looking number mask genuinely insufficient
    # data.
    confidence = quality

    is_sparse = (
        quality_observed_days < 14
        or coverage < 0.50
    )

    data_quality = {
        "quality": quality,
        "confidence": confidence,
        "isSparse": bool(is_sparse),
        "observedDays": quality_observed_days,
        "calendarDays": calendar_days,
        "missingDays": missing_days,
        "coverage": round(coverage, 4),
    }

    # -----------------------------------------------------
    # MODEL DIAGNOSTICS
    # -----------------------------------------------------

    if quality_observed_days > 0:
        spike_days = int(
            _detect_revenue_spikes(
                daily.loc[
                    daily["observed"],
                    "revenue"
                ].to_numpy()
            ).sum()
        )
    else:
        spike_days = 0

    def _round_or_none(value, digits=4):
        return round(value, digits) if value is not None else None

    model_diagnostics = {
        "aov": round(aov, 2),
        "orderBaseline": round(
            order_baseline,
            3,
        ),
        "weekdaySeasonality": {
            str(key): round(value, 4)
            for key, value
            in weekday_seasonality.items()
        },
        "aovWeekdaySeasonality": {
            str(key): round(value, 4)
            for key, value
            in aov_weekday_factor.items()
        },
        "spikeDays": spike_days,
        # V4.1 diagnostics.
        "revenueLag1": _round_or_none(v41_features.get("revenueLag1"), 2),
        "revenueLag7": _round_or_none(v41_features.get("revenueLag7"), 2),
        "ordersLag1": _round_or_none(v41_features.get("ordersLag1"), 2),
        "ordersLag7": _round_or_none(v41_features.get("ordersLag7"), 2),
        "aovLag1": _round_or_none(v41_features.get("aovLag1"), 2),
        "aovLag7": _round_or_none(v41_features.get("aovLag7"), 2),
        "revenueRolling7": _round_or_none(v41_features.get("revenueRolling7"), 2),
        "ordersRolling7": _round_or_none(v41_features.get("ordersRolling7"), 3),
        "aovRolling7": _round_or_none(v41_features.get("aovRolling7"), 2),
        "revenueTrend": _round_or_none(v41_features.get("revenueTrend"), 4),
        "orderTrend": _round_or_none(v41_features.get("orderTrend"), 4),
        "aovTrend": _round_or_none(v41_features.get("aovTrend"), 4),
        "spikeCountRecent": v41_features.get("spikeCountRecent"),
        "spikeRegimeDamping": _round_or_none(
            v41_features.get("spikeRegimeDamping"), 3
        ),
    }

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "success": True,
        "algorithm": "orders-times-dynamic-aov-robust-seasonal-trend-adjusted",
        "modelVersion": MODEL_VERSION,
        "mae": (
            round(mae, 4)
            if mae is not None
            else None
        ),
        "rmse": (
            round(rmse, 4)
            if rmse is not None
            else None
        ),
        "mape": (
            round(mape, 4)
            if mape is not None
            else None
        ),
        "wape": (
            round(wape, 4)
            if wape is not None
            else None
        ),
        "smape": (
            round(smape, 4)
            if smape is not None
            else None
        ),
        "evaluationDays": evaluation_days,
        "evaluation": {
            "status": (
                "reliable"
                if evaluation_days >= 14
                else "limited"
            ),
            "confidence": (
                "high"
                if evaluation_days >= 14
                else "medium"
                if evaluation_days >= 7
                else "low"
            ),
            "evaluationDays": evaluation_days,
            "minimumRecommendedDays": 14,
            "message": (
                None
                if evaluation_days >= 14
                else (
                    "Forecast accuracy evaluation is based on a limited "
                    "number of observed holdout days."
                )
            ),
            # TEMPORARY DIAGNOSTIC: remove once the V4 vs baseline
            # WAPE gap is root-caused (see sales-forecast-v4.1 follow-up).
            "evaluationByDay": evaluation_details,
        },
        "baselineComparison": {
            "algorithm": "robust-weighted-moving-average",
            "wape": (
                round(baseline_wape, 4)
                if baseline_wape is not None
                else None
            ),
            "improvementPercent": (
                round(improvement_percent, 2)
                if improvement_percent is not None
                else None
            ),
        },
        # Baseline -> V4 -> V4.1 comparison, per the v4.1 spec.
        "modelComparison": {
            "baseline": {
                "algorithm": "robust-weighted-moving-average",
                "wape": (
                    round(baseline_wape, 4)
                    if baseline_wape is not None
                    else None
                ),
            },
            "v4": {
                "algorithm": "orders-times-dynamic-aov-robust-seasonal",
                "wape": (
                    round(v4_wape, 4)
                    if v4_wape is not None
                    else None
                ),
                "improvementOverBaselinePercent": (
                    round(v4_improvement_percent, 2)
                    if v4_improvement_percent is not None
                    else None
                ),
            },
            "v4_1": {
                "algorithm": "orders-times-dynamic-aov-robust-seasonal-trend-adjusted",
                "wape": (
                    round(wape, 4)
                    if wape is not None
                    else None
                ),
                "improvementOverBaselinePercent": (
                    round(improvement_percent, 2)
                    if improvement_percent is not None
                    else None
                ),
                "improvementOverV4Percent": (
                    round(v41_improvement_over_v4_percent, 2)
                    if v41_improvement_over_v4_percent is not None
                    else None
                ),
            },
            "bestModel": (
                min(
                    (
                        (baseline_wape, "baseline"),
                        (v4_wape, "v4"),
                        (wape, "v4_1"),
                    ),
                    key=lambda pair: (
                        pair[0] if pair[0] is not None else float("inf")
                    ),
                )[1]
                if any(
                    value is not None
                    for value in (baseline_wape, v4_wape, wape)
                )
                else None
            ),
        },
        "modelDiagnostics": model_diagnostics,
        "dataQuality": data_quality,
        "forecast": forecast,
    }