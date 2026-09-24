from fastapi import APIRouter

from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
)

from app.services.recommendation_service import (
    generate_recommendations,
)

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


@router.post(
    "/generate",
    response_model=RecommendationResponse,
)
def recommendation_endpoint(
    request: RecommendationRequest,
):

    return generate_recommendations(request)