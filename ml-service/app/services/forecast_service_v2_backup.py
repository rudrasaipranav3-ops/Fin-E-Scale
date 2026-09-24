from datetime import timedelta

import numpy as np
import pandas as pd


# =========================================================
# CONFIGURATION
# =========================================================

MODEL_VERSION = "sales-forecast-v2"

MIN_HISTORY_POINTS = 5

# Number of historical days used for the recent baseline.
BASELINE_WINDOW = 14

# Maximum amount by which the forecast is allowed to change
# per day as a percentage of the baseline.
MAX_DAILY_TREND_RATIO = 0.03

# Minimum trend magnitude in absolute currency units.
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

def _calculate_weekday_seasonality(daily):
    """
    Estimate conservative weekly seasonality from observed
    calendar-day revenue.

    The factor represents how a weekday behaves relative to
    the overall average calendar-day revenue.

    Safeguards:
    - Uses only genuinely observed days.
    - Requires enough observations.
    - Uses robust clipping to reduce spike influence.
    - Shrinks weak weekday estimates toward 1.0.
    - Bounds the final seasonal factor.
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

    # ---------------------------------------------------------
    # ROBUST GLOBAL BASELINE
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # WEEKDAY FACTORS
    # ---------------------------------------------------------

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

        # Shrink estimates from poorly represented
        # weekdays toward neutral seasonality.
        confidence = min(
            1.0,
            count / 6.0,
        )

        factor = (
            1.0
            + (raw_factor - 1.0) * confidence
        )

        # Conservative bounds prevent one weekday
        # from dominating the forecast.
        factor = float(
            np.clip(
                factor,
                0.75,
                1.25,
            )
        )

        seasonality[weekday] = factor

    print("========== WEEKLY SEASONALITY ==========")
    print("Monday:", seasonality.get(0, 1.0))
    print("Tuesday:", seasonality.get(1, 1.0))
    print("Wednesday:", seasonality.get(2, 1.0))
    print("Thursday:", seasonality.get(3, 1.0))
    print("Friday:", seasonality.get(4, 1.0))
    print("Saturday:", seasonality.get(5, 1.0))
    print("Sunday:", seasonality.get(6, 1.0))
    print("=========================================")

    return seasonality


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
            item_orders = item.get("orders")
            raw_observed = item.get("observed")
        else:
            item_date = getattr(item, "date", None)
            item_revenue = getattr(item, "revenue", None)
            item_orders = getattr(item, "orders", None)
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
    Generate a conservative sales-revenue forecast.

    Strategy:

    1. Convert history into a continuous daily series.
    2. Use recent observations for the baseline.
    3. Reduce the influence of extreme revenue spikes.
    4. Apply only a small, bounded trend.
    5. Prevent negative predictions.
    6. Generate a robust prediction interval.
    7. Calculate genuine rolling backtest metrics.
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

    # -----------------------------------------------------
    # RECENT HISTORY
    # -----------------------------------------------------

    # For sparse/intermittent sales, do NOT calculate the
    # revenue baseline from zero-filled calendar days.
    #
    # The calendar series is useful for measuring occurrence
    # frequency, but zero-filled gaps would artificially pull
    # the revenue level toward zero.
    observed_mask = daily["observed"].astype(bool)

    observed_revenue = (
        revenue.loc[observed_mask]
        .to_numpy(dtype=float)
    )

    if len(observed_revenue) == 0:
        raise ValueError(
            "No observed sales days are available for forecasting."
        )

    window = min(
        BASELINE_WINDOW,
        len(observed_revenue),
    )

    recent = observed_revenue[-window:]

    # -----------------------------------------------------
    # ROBUST BASELINE
    # -----------------------------------------------------

    # Estimate the typical revenue on a genuine selling day.
    robust_recent = _robust_clip(recent)

    selling_day_baseline = _weighted_average(
        robust_recent
    )

    selling_day_baseline = max(
        0.0,
        _safe_float(selling_day_baseline),
    )

    # -----------------------------------------------------
    # SALES-OCCURRENCE RATE
    # -----------------------------------------------------

    observed_days = int(
        daily["observed"].sum()
    )

    calendar_days = len(daily)

    sales_day_rate = (
        observed_days / calendar_days
        if calendar_days > 0
        else 0.0
    )

    sales_day_rate = float(
        np.clip(
            sales_day_rate,
            0.0,
            1.0,
        )
    )

    # Expected revenue per calendar day:
    #
    #   probability of a selling day
    #       ×
    #   expected revenue on a selling day
    #
    # This prevents sparse transaction histories from
    # producing an unrealistically large daily forecast.
    baseline = (
        selling_day_baseline
        * sales_day_rate
    )

    baseline = max(
        0.0,
        _safe_float(baseline),
    )
    # -----------------------------------------------------
    # WEEKLY SEASONALITY
    # -----------------------------------------------------

    weekday_seasonality = _calculate_weekday_seasonality(
        daily
    )


    # -----------------------------------------------------
    # TREND ESTIMATION
    # -----------------------------------------------------

    if len(robust_recent) >= 3:
        x = np.arange(
            len(robust_recent),
            dtype=float,
        )

        raw_slope = float(
            np.polyfit(
                x,
                robust_recent,
                1,
            )[0]
        )
    else:
        raw_slope = 0.0

    # Limit trend to a conservative percentage
    # of the baseline.
    max_daily_change = max(
        baseline * MAX_DAILY_TREND_RATIO,
        MIN_DAILY_TREND,
    )

    slope = float(
        np.clip(
            raw_slope,
            -max_daily_change,
            max_daily_change,
        )
    )

    # -----------------------------------------------------
    # ADDITIONAL TREND SAFETY
    # -----------------------------------------------------

    # If the historical series is highly volatile,
    # suppress the trend further.
    if len(recent) >= 5:
        recent_mean = float(
            np.mean(recent)
        )

        recent_std = float(
            np.std(recent, ddof=1)
        )

        if (
            recent_mean > 0
            and np.isfinite(recent_std)
        ):
            coefficient_of_variation = (
                recent_std / recent_mean
            )

            if coefficient_of_variation > 1.0:
                slope *= 0.25

            elif coefficient_of_variation > 0.75:
                slope *= 0.50

    # -----------------------------------------------------
    # SPARSE-DATA TREND CONTROL
    # -----------------------------------------------------

    # Sparse data should reduce confidence in the trend,
    # but it should not automatically force the forecast
    # to be completely flat.
    #
    # The baseline already accounts for sales-day frequency.
    # Therefore the trend is applied conservatively.
    observed_days = int(daily["observed"].sum())
    calendar_days_for_sparsity = len(daily)

    coverage_for_sparsity = (
        observed_days / calendar_days_for_sparsity
        if calendar_days_for_sparsity > 0
        else 0.0
    )

    is_sparse = (
        observed_days < 14
        or coverage_for_sparsity < 0.50
    )

    if observed_days < 7:
        # Extremely small history: no reliable trend.
        slope = 0.0

    elif observed_days < 14 or coverage_for_sparsity < 0.50:
        # Sparse history: retain only a small portion of
        # the observed selling-day trend.
        slope *= 0.20

    elif observed_days < 30:
        slope *= 0.50

    # -----------------------------------------------------
    # HISTORICAL ERROR ESTIMATION
    # -----------------------------------------------------

    # Estimate residuals against the conservative
    # baseline/trend model.
    fitted = []

    for index in range(len(recent)):
        fitted_value = (
            selling_day_baseline
            + slope * (
                index
                - len(recent)
                + 1
            )
        )

        fitted.append(
            max(0.0, fitted_value)
        )

    fitted = np.asarray(
        fitted,
        dtype=float,
    )

    residuals = (
        recent - fitted
    )

    if len(residuals) > 1:
        error_std = float(
            np.std(
                residuals,
                ddof=1,
            )
        )
    else:
        error_std = baseline * 0.10

    # Ensure a sensible minimum uncertainty.
    minimum_error = max(
        baseline * 0.10,
        selling_day_baseline
        * max(0.10, 1.0 - sales_day_rate),
        1.0,
    )

    if (
        not np.isfinite(error_std)
        or error_std <= 0
    ):
        error_std = minimum_error

    error_std = max(
        error_std,
        minimum_error,
    )

    # -----------------------------------------------------
    # ORDER-COUNT BASELINE (for predictedOrders)
    # -----------------------------------------------------

    order_counts = [
        max(0, int(value))
        for value in daily["orders"].to_numpy()
    ]

    total_orders = int(sum(order_counts))

    if total_orders > 0:
        # Use the same recent-window philosophy as the
        # revenue baseline, but forecast order volume directly.
        recent_order_counts = order_counts[-BASELINE_WINDOW:]

        predicted_orders_baseline = _weighted_average(
            recent_order_counts
        )

        predicted_orders_baseline = max(
            0.0,
            _safe_float(predicted_orders_baseline),
        )
    else:
        predicted_orders_baseline = None

    print("========== ORDER FORECAST DEBUG ==========")
    print("Order counts:", order_counts)
    print("Total orders:", total_orders)
    print("Recent order counts:", order_counts[-BASELINE_WINDOW:])
    print("Predicted orders baseline:", predicted_orders_baseline)
    print("==========================================")

    # -----------------------------------------------------
    # GENERATE FUTURE FORECAST
    # -----------------------------------------------------

    last_date = daily.index[-1]

    forecast = []

    # Running remainder for cumulative ("bucket") rounding of
    # predicted order counts. Rounding the same fractional
    # baseline independently on every day (e.g. round(0.75))
    # always yields 1 for every future day, which is
    # misleading. Accumulating the fractional demand and only
    # emitting a unit once the remainder crosses 1 means the
    # *sum* of predicted orders across the horizon tracks the
    # true expected demand instead.
    order_remainder = 0.0

    for day in range(
        1,
        horizon_days + 1,
    ):
        forecast_date = (
            last_date
            + timedelta(days=day)
        )

                # -----------------------------------------------------
        # TREND + WEEKLY SEASONALITY
        # -----------------------------------------------------

        trend_value = (
            baseline
            + slope * day
        )

        trend_value = max(
            0.0,
            trend_value,
        )

        weekday = forecast_date.weekday()

        seasonal_factor = weekday_seasonality.get(
            weekday,
            1.0,
        )

        predicted = (
            trend_value
            * seasonal_factor
        )

        predicted = max(
            0.0,
            predicted,
        )

        # Prevent extreme long-horizon growth.
        seasonal_baseline = (
            baseline
            * seasonal_factor
        )

        max_forecast = max(
            seasonal_baseline * 1.50,
            seasonal_baseline + minimum_error,
        )

        min_forecast = max(
            0.0,
            seasonal_baseline * 0.50,
        )

        predicted = float(
            np.clip(
                predicted,
                min_forecast,
                max_forecast,
            )
        )

        # Prediction interval stays tied to the predicted
        # revenue rather than exploding with sqrt(day).
        baseline_uncertainty = max(
            abs(seasonal_baseline) * 0.10,
            1.0,
        )

        horizon_factor = min(
            0.25,
            0.10 + (day / horizon_days) * 0.15,
        )

        uncertainty = max(
            baseline_uncertainty,
            predicted * horizon_factor,
        )

        lower = max(
            0.0,
            predicted - uncertainty,
        )

        upper = (
            predicted
            + uncertainty
        )

        if predicted_orders_baseline is not None:
            order_remainder += predicted_orders_baseline

            predicted_orders = int(
                np.floor(order_remainder)
            )

            order_remainder -= predicted_orders

            predicted_orders = max(0, predicted_orders)
        else:
            predicted_orders = None

        forecast.append(
            {
                "date": forecast_date.strftime(
                    "%Y-%m-%d"
                ),
                "predictedRevenue": round(
                    predicted,
                    2,
                ),
                "predictedOrders": predicted_orders,
                "lowerBound": round(
                    lower,
                    2,
                ),
                "upperBound": round(
                    upper,
                    2,
                ),
            }
        )

    # -----------------------------------------------------
    # ROLLING BACKTEST
    # -----------------------------------------------------

    mae = None
    rmse = None
    mape = None
    wape = None
    smape = None
    evaluation_days = 0

    if len(revenue) >= MIN_HISTORY_POINTS:
        actual_values = []
        predicted_values = []

        # Evaluate one-step-ahead forecasts.
        #
        # This is much more meaningful than comparing
        # every historical point against one fixed baseline.

        start_index = max(
            3,
            len(revenue) - 14,
        )

        for index in range(
            start_index,
            len(revenue),
        ):
            training = (
                revenue
                .iloc[:index]
                .to_numpy(
                    dtype=float
                )
            )

            if len(training) == 0:
                continue

            # Same occurrence × magnitude split the production
            # forecast uses, computed only from the training
            # slice available at this point in the backtest (no
            # look-ahead). Without this, the backtest metrics
            # describe a different model than the one actually
            # used for the final forecast.
            training_observed = (
                daily["observed"]
                .iloc[:index]
                .to_numpy(dtype=bool)
            )

            training_observed_revenue = training[training_observed]

            if len(training_observed_revenue) == 0:
                continue

            test_window = min(
                BASELINE_WINDOW,
                len(training_observed_revenue),
            )

            training_recent = (
                training_observed_revenue[-test_window:]
            )

            training_robust = _robust_clip(
                training_recent
            )

            test_selling_day_baseline = (
                _weighted_average(
                    training_robust
                )
            )

            test_selling_day_baseline = max(
                0.0,
                test_selling_day_baseline,
            )

            test_calendar_days = len(training_observed)
            test_observed_days = int(
                training_observed.sum()
            )

            test_coverage = (
                test_observed_days / test_calendar_days
                if test_calendar_days > 0
                else 0.0
            )

            test_sales_day_rate = float(
                np.clip(
                    test_coverage,
                    0.0,
                    1.0,
                )
            )

            test_baseline = (
                test_selling_day_baseline
                * test_sales_day_rate
            )

            test_baseline = max(
                0.0,
                test_baseline,
            )

            if len(training_robust) >= 3:
                x = np.arange(
                    len(training_robust),
                    dtype=float,
                )

                test_slope = float(
                    np.polyfit(
                        x,
                        training_robust,
                        1,
                    )[0]
                )
            else:
                test_slope = 0.0

            test_max_change = max(
                test_baseline
                * MAX_DAILY_TREND_RATIO,
                MIN_DAILY_TREND,
            )

            test_slope = float(
                np.clip(
                    test_slope,
                    -test_max_change,
                    test_max_change,
                )
            )

            # -----------------------------------------------------
            # SAME VOLATILITY TREND CONTROL AS PRODUCTION
            # -----------------------------------------------------

            if len(training_recent) >= 5:
                test_recent_mean = float(
                    np.mean(training_recent)
                )

                test_recent_std = float(
                    np.std(
                        training_recent,
                        ddof=1,
                    )
                )

                if (
                    test_recent_mean > 0
                    and np.isfinite(test_recent_std)
                ):
                    test_coefficient_of_variation = (
                        test_recent_std
                        / test_recent_mean
                    )

                    if test_coefficient_of_variation > 1.0:
                        test_slope *= 0.25

                    elif test_coefficient_of_variation > 0.75:
                        test_slope *= 0.50

            # -----------------------------------------------------
            # SAME TIERED SPARSE-DATA TREND CONTROL AS PRODUCTION
            # -----------------------------------------------------

            if test_observed_days < 7:
                test_slope = 0.0

            elif test_observed_days < 14 or test_coverage < 0.50:
                test_slope *= 0.20

            elif test_observed_days < 30:
                test_slope *= 0.50

            # -----------------------------------------------------
            # WEEKDAY SEASONALITY
            # -----------------------------------------------------
            #
            # Use only the training slice available at this
            # backtest point. This keeps the validation
            # free from look-ahead bias.
            # -----------------------------------------------------

            training_daily = daily.iloc[:index].copy()

            test_weekday_seasonality = (
                _calculate_weekday_seasonality(
                    training_daily
                )
            )

            target_date = daily.index[index]

            target_weekday = target_date.weekday()

            seasonal_factor = (
                test_weekday_seasonality.get(
                    target_weekday,
                    1.0,
                )
            )

            prediction = (
                test_baseline
                + test_slope
            ) * seasonal_factor

            prediction = max(
                0.0,
                prediction,
            )

            # Clip bounds must be built from the seasonally-scaled
            # baseline, not the raw baseline, to match production
            # exactly (see seasonal_baseline in the production
            # forecast loop). test_minimum_error itself stays
            # unseasonalized, mirroring production's minimum_error.

            test_minimum_error = max(
                test_baseline * 0.10,
                test_selling_day_baseline
                * max(0.10, 1.0 - test_sales_day_rate),
                1.0,
            )

            test_seasonal_baseline = (
                test_baseline * seasonal_factor
            )

            test_max_forecast = max(
                test_seasonal_baseline * 1.50,
                test_seasonal_baseline
                + test_minimum_error,
            )

            test_min_forecast = max(
                0.0,
                test_seasonal_baseline * 0.50,
            )

            prediction = float(
                np.clip(
                    prediction,
                    test_min_forecast,
                    test_max_forecast,
                )
            )

            # -----------------------------------------------------
            # EVALUATE ONLY GENUINE OBSERVED SALES DAYS
            # -----------------------------------------------------
            #
            # The daily series contains zero-filled calendar days.
            # Those zero-filled days are useful for forecasting, but
            # they should NOT be treated as genuine sales observations
            # when calculating accuracy metrics.
            #
            # This prevents sparse-history datasets from producing
            # misleading MAPE / MAE / RMSE results simply because
            # many calendar days contain synthetic zero revenue.
            # -----------------------------------------------------

            is_observed_day = bool(
                daily["observed"].iloc[index]
            )

            if not is_observed_day:
                continue

            actual = float(
                revenue.iloc[index]
            )

            actual_values.append(actual)
            predicted_values.append(
                prediction
            )

        if actual_values:
            evaluation_days = len(actual_values)

            actual_array = np.asarray(
                actual_values,
                dtype=float,
            )

            predicted_array = np.asarray(
                predicted_values,
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
    # data. is_sparse also drives trend suppression above, so
    # this reflects the same judgment the forecast itself made.
    confidence = quality

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
    # RESPONSE
    # -----------------------------------------------------

    return {
        "success": True,
        "algorithm": "robust-weighted-moving-average",
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
        "dataQuality": data_quality,
        "forecast": forecast,
    }