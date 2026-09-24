from fastapi import (
    APIRouter,
    HTTPException,
)

from app.schemas.churn import (
    ChurnPredictionRequest,
    ChurnPredictionResponse,
)

from app.services.churn_service import (
    MODEL_VERSION,
    predict_churn,
)


router = APIRouter(
    prefix="/api/ml/churn",
    tags=["Churn Prediction"],
)


@router.post(
    "/predict",
    response_model=(
        ChurnPredictionResponse
    ),
)
def run_churn_prediction(
    request: ChurnPredictionRequest,
):
    try:
        if not request.customers:
            raise HTTPException(
                status_code=400,
                detail=(
                    "At least one customer "
                    "is required."
                ),
            )

        predictions = predict_churn(
            request.customers
        )

        return (
            ChurnPredictionResponse(
                success=True,
                modelVersion=(
                    MODEL_VERSION
                ),
                customerCount=len(
                    predictions
                ),
                customers=predictions,
            )
        )

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to generate "
                "churn predictions."
            ),
        ) from error