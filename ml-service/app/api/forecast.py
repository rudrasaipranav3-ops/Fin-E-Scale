from fastapi import APIRouter, HTTPException

from app.schemas.forecast import (
    ForecastRequest,
    ForecastResponse,
)

from app.services.forecast_service import (
    generate_sales_forecast,
)


router = APIRouter(
    prefix="/api/ml/forecast",
    tags=["Sales Forecast"],
)


@router.post(
    "/predict",
    response_model=ForecastResponse,
)
def predict_sales_forecast(
    request: ForecastRequest,
):
    try:
        result = generate_sales_forecast(
            request.history,
            request.horizonDays,
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Forecast generation failed: {exc}",
        )