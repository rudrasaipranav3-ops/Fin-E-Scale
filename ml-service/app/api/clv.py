from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.clv_service import predict_customer_clv


router = APIRouter(
    prefix="/api/ml/clv",
    tags=["Customer Lifetime Value"],
)


class CLVCustomerFeatures(BaseModel):
    customerId: str

    recencyDays: float = Field(default=0, ge=0)
    frequency: int = Field(default=0, ge=0)
    monetary: float = Field(default=0, ge=0)

    averageOrderValue: float = Field(default=0, ge=0)
    tenureDays: float = Field(default=0, ge=0)
    averageDaysBetweenOrders: float = Field(default=0, ge=0)


class CLVPredictionRequest(BaseModel):
    customers: List[CLVCustomerFeatures]


@router.post("/predict")
async def predict_clv(payload: CLVPredictionRequest):
    customers = [
        customer.model_dump()
        for customer in payload.customers
    ]

    return predict_customer_clv(customers)