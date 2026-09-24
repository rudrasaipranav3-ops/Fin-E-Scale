from __future__ import annotations

from typing import Any


MODEL_VERSION = "behavioral-clv-v1"


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
        return number if number >= 0 else default
    except (TypeError, ValueError):
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        number = int(value)
        return number if number >= 0 else default
    except (TypeError, ValueError):
        return default


def predict_customer_clv(customers: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Behavioral CLV baseline.

    Uses:
    - historical monetary value
    - purchase frequency
    - average order value
    - recency
    - customer tenure
    - average days between purchases

    This is intentionally a deterministic baseline model so the
    Express -> FastAPI -> Prisma integration can be validated before
    introducing a trained probabilistic/regression CLV model.
    """

    predictions: list[dict[str, Any]] = []

    for customer in customers:
        customer_id = str(customer.get("customerId", "")).strip()

        if not customer_id:
            continue

        frequency = _safe_int(customer.get("frequency"))
        monetary = _safe_float(customer.get("monetary"))
        average_order_value = _safe_float(
            customer.get("averageOrderValue")
        )
        recency_days = _safe_float(customer.get("recencyDays"))
        tenure_days = _safe_float(customer.get("tenureDays"))
        average_days_between_orders = _safe_float(
            customer.get("averageDaysBetweenOrders")
        )

        # -----------------------------------------------
        # Purchase-rate estimate
        # -----------------------------------------------

        tenure_months = max(tenure_days / 30.0, 1.0)

        monthly_purchase_rate = frequency / tenure_months

        # -----------------------------------------------
        # Expected purchases over next 12 months
        # -----------------------------------------------

        expected_future_orders = monthly_purchase_rate * 12.0

        # Prevent tiny datasets from generating extreme values.
        expected_future_orders = min(
            max(expected_future_orders, 0.0),
            24.0,
        )

        # -----------------------------------------------
        # Recency retention factor
        # -----------------------------------------------

        if recency_days <= 30:
            retention_factor = 0.95
        elif recency_days <= 60:
            retention_factor = 0.85
        elif recency_days <= 90:
            retention_factor = 0.70
        elif recency_days <= 180:
            retention_factor = 0.50
        else:
            retention_factor = 0.30

        # Purchase consistency provides an additional signal.
        if average_days_between_orders > 0:
            consistency_factor = max(
                0.50,
                min(
                    1.0,
                    90.0 / average_days_between_orders,
                ),
            )
        else:
            consistency_factor = 0.60

        effective_order_value = (
            average_order_value
            if average_order_value > 0
            else monetary / max(frequency, 1)
        )

        future_value = (
            expected_future_orders
            * effective_order_value
            * retention_factor
            * consistency_factor
        )

        # Historical value is included at a reduced weight so that
        # customers with meaningful existing value are represented.
        historical_component = monetary * 0.25

        predicted_value = historical_component + future_value

        # -----------------------------------------------
        # Confidence score
        # -----------------------------------------------

        frequency_confidence = min(frequency / 10.0, 1.0)
        tenure_confidence = min(tenure_days / 365.0, 1.0)

        confidence_score = (
            0.55
            + frequency_confidence * 0.25
            + tenure_confidence * 0.20
        )

        confidence_score = min(
            max(confidence_score, 0.0),
            0.95,
        )

        predictions.append(
            {
                "customerId": customer_id,
                "predictedValue": round(predicted_value, 2),
                "confidenceScore": round(confidence_score, 4),
            }
        )

    total_predicted_value = sum(
        item["predictedValue"]
        for item in predictions
    )

    average_predicted_value = (
        total_predicted_value / len(predictions)
        if predictions
        else 0.0
    )

    return {
        "success": True,
        "modelVersion": MODEL_VERSION,
        "modelType": "behavioral-clv",
        "customerCount": len(predictions),
        "totalPredictedValue": round(total_predicted_value, 2),
        "averagePredictedValue": round(average_predicted_value, 2),
        "customers": predictions,
    }