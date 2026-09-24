from fastapi import (
    APIRouter,
    HTTPException,
)

from app.schemas.market_basket import (
    MarketBasketAnalysisRequest,
    MarketBasketAnalysisResponse,
)

from app.services.market_basket_service import (
    analyze_market_basket,
)


router = APIRouter(
    prefix="/api/ml/market-basket",
    tags=["Market Basket Analysis"],
)


@router.post(
    "/analyze",
    response_model=MarketBasketAnalysisResponse,
)
def run_market_basket_analysis(
    request: MarketBasketAnalysisRequest,
):
    try:
        return analyze_market_basket(
            request
        )

    except Exception as error:
        print(
            "Market basket analysis error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to perform market "
                "basket analysis."
            ),
        ) from error