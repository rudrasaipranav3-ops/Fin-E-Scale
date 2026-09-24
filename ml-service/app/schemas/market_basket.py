from pydantic import BaseModel, Field


class MarketBasketTransaction(BaseModel):
    orderId: str
    items: list[str] = Field(min_length=1)


class MarketBasketAnalysisRequest(BaseModel):
    transactions: list[MarketBasketTransaction] = Field(
        min_length=1
    )

    minSupport: float = Field(
        default=0.01,
        gt=0.0,
        le=1.0,
    )

    minConfidence: float = Field(
        default=0.30,
        ge=0.0,
        le=1.0,
    )


class FrequentItemset(BaseModel):
    items: list[str]
    support: float
    count: int


class AssociationRule(BaseModel):
    antecedents: list[str]
    consequents: list[str]

    support: float
    confidence: float
    lift: float


class MarketBasketAnalysisResponse(BaseModel):
    success: bool

    algorithm: str
    modelVersion: str

    transactionCount: int
    uniqueProductCount: int

    frequentItemsetCount: int
    associationRuleCount: int

    averageConfidence: float
    maximumLift: float

    strongestRule: AssociationRule | None

    frequentItemsets: list[FrequentItemset]
    rules: list[AssociationRule]

class Transaction(BaseModel):
    orderId: str
    items: list[str]