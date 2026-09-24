from fastapi import APIRouter, HTTPException

from app.schemas.segmentation import (
    SegmentationRequest,
    SegmentationResponse,
)

from app.services.segmentation_service import (
    run_segmentation,
)


router = APIRouter(
    prefix="/segmentation",
    tags=["Customer Segmentation"],
)


@router.post(
    "/run",
    response_model=SegmentationResponse,
)
def segment_customers(
    request: SegmentationRequest,
):
    try:
        customers = [
            customer.model_dump()
            for customer in request.customers
        ]

        return run_segmentation(
            customers
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Customer segmentation failed.",
        ) from error