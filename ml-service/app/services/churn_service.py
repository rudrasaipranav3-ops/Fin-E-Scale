from app.schemas.churn import (
    ChurnCustomerFeatures,
    ChurnCustomerPrediction,
)


MODEL_VERSION = "behavioral-churn-v1"


def _clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 1.0,
) -> float:
    return max(
        minimum,
        min(maximum, value),
    )


def _normalize(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    if maximum <= minimum:
        return 0.0

    return _clamp(
        (value - minimum)
        / (maximum - minimum)
    )


def _inverse_normalize(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    return 1.0 - _normalize(
        value,
        minimum,
        maximum,
    )


def _risk_level(
    probability: float,
) -> str:
    if probability >= 0.70:
        return "HIGH"

    if probability >= 0.40:
        return "MEDIUM"

    return "LOW"


def predict_churn(
    customers: list[
        ChurnCustomerFeatures
    ],
) -> list[
    ChurnCustomerPrediction
]:
    if not customers:
        return []

    recencies = [
        customer.recencyDays
        for customer in customers
    ]

    frequencies = [
        customer.frequency
        for customer in customers
    ]

    monetary_values = [
        customer.monetaryValue
        for customer in customers
    ]

    average_order_values = [
        customer.averageOrderValue
        for customer in customers
    ]

    tenures = [
        customer.customerTenureDays
        for customer in customers
    ]

    average_gaps = [
        customer.averageDaysBetweenOrders
        for customer in customers
    ]

    min_recency = min(recencies)
    max_recency = max(recencies)

    min_frequency = min(frequencies)
    max_frequency = max(frequencies)

    min_monetary = min(
        monetary_values
    )
    max_monetary = max(
        monetary_values
    )

    min_aov = min(
        average_order_values
    )
    max_aov = max(
        average_order_values
    )

    min_tenure = min(tenures)
    max_tenure = max(tenures)

    min_gap = min(average_gaps)
    max_gap = max(average_gaps)

    predictions = []

    for customer in customers:
        # Higher recency means the customer
        # has been inactive for longer.
        recency_risk = _normalize(
            customer.recencyDays,
            min_recency,
            max_recency,
        )

        # Lower frequency means greater
        # churn risk.
        frequency_risk = (
            _inverse_normalize(
                customer.frequency,
                min_frequency,
                max_frequency,
            )
        )

        # Lower historical spending
        # contributes to greater risk.
        monetary_risk = (
            _inverse_normalize(
                customer.monetaryValue,
                min_monetary,
                max_monetary,
            )
        )

        # Lower AOV contributes a smaller
        # amount to the risk calculation.
        aov_risk = (
            _inverse_normalize(
                customer.averageOrderValue,
                min_aov,
                max_aov,
            )
        )

        # Longer gaps between purchases
        # indicate weaker engagement.
        gap_risk = _normalize(
            customer.averageDaysBetweenOrders,
            min_gap,
            max_gap,
        )

        # Very new customers have less
        # established purchasing history.
        tenure_risk = (
            _inverse_normalize(
                customer.customerTenureDays,
                min_tenure,
                max_tenure,
            )
        )

        probability = (
            recency_risk * 0.35
            + frequency_risk * 0.25
            + monetary_risk * 0.15
            + gap_risk * 0.15
            + aov_risk * 0.05
            + tenure_risk * 0.05
        )

        probability = round(
            _clamp(probability),
            4,
        )

        risk_level = _risk_level(
            probability
        )

        predicted_churn = (
            probability >= 0.50
        )

        predictions.append(
            ChurnCustomerPrediction(
                customerId=(
                    customer.customerId
                ),
                churnProbability=(
                    probability
                ),
                predictedChurn=(
                    predicted_churn
                ),
                riskLevel=risk_level,
            )
        )

    return predictions