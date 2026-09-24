from fastapi import FastAPI

from app.api.clv import (
    router as clv_router,
)

from app.api.segmentation import (
    router as segmentation_router,
)

from app.api.churn import (
    router as churn_router,
)

from app.api.market_basket import (
    router as market_basket_router,
)

from app.api.recommendation import (
    router as recommendation_router,
)

from app.api.forecast import (
    router as forecast_router,
)


app = FastAPI(
    title="E-Commerce Analytics ML Service",
    description=(
        "Machine-learning microservice for the "
        "E-Commerce Customer Analytics Platform."
    ),
    version="1.0.0",
)


# =========================================================
# CUSTOMER SEGMENTATION
# =========================================================

app.include_router(
    segmentation_router,
    prefix="/api/ml",
)


# =========================================================
# CHURN PREDICTION
# =========================================================

app.include_router(
    churn_router
)


# =========================================================
# CUSTOMER LIFETIME VALUE
# =========================================================

app.include_router(
    clv_router
)


# =========================================================
# MARKET BASKET ANALYSIS
# =========================================================

app.include_router(
    market_basket_router
)


app.include_router(
    recommendation_router,
    prefix="/api/ml",
)

# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "success": True,
        "status": "OK",
        "service": "ml-service",
    }


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "success": True,
        "service": (
            "E-Commerce Analytics ML Service"
        ),
        "version": "1.0.0",
    }

# =========================================================
# SALES FORECASTING
# =========================================================

app.include_router(
    forecast_router,
)