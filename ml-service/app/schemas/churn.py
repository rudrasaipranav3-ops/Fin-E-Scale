from pydantic import BaseModel, Field


class ChurnCustomerFeatures(BaseModel):
    customerId: str

    recencyDays: float = Field(ge=0)
    frequency: int = Field(ge=0)
    monetaryValue: float = Field(ge=0)
    averageOrderValue: float = Field(ge=0)

    customerTenureDays: float = Field(ge=0)
    averageDaysBetweenOrders: float = Field(ge=0)


class ChurnPredictionRequest(BaseModel):
    customers: list[ChurnCustomerFeatures]


class ChurnCustomerPrediction(BaseModel):
    customerId: str

    churnProbability: float = Field(
        ge=0,
        le=1,
    )

    predictedChurn: bool

    riskLevel: str


class ChurnPredictionResponse(BaseModel):
    success: bool

    modelVersion: str

    customerCount: int

    customers: list[
        ChurnCustomerPrediction
    ]