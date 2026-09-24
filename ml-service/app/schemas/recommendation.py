from pydantic import BaseModel, Field


class RecommendationCustomer(BaseModel):
    customerId: str
    customerName: str
    segment: str | None = None


class RecommendationProduct(BaseModel):
    productId: str
    productName: str
    category: str | None = None


class RecommendationOrder(BaseModel):
    customerId: str
    productId: str


class MarketBasketRule(BaseModel):
    antecedents: list[str]
    consequents: list[str]
    confidence: float
    lift: float


class RecommendationRequest(BaseModel):
    customers: list[RecommendationCustomer]

    products: list[RecommendationProduct]

    orders: list[RecommendationOrder]

    marketBasketRules: list[MarketBasketRule] = Field(default_factory=list)


class RecommendedProduct(BaseModel):
    productId: str

    score: float

    reason: str


class CustomerRecommendation(BaseModel):
    customerId: str

    recommendedProducts: list[RecommendedProduct]


class RecommendationResponse(BaseModel):
    success: bool

    algorithm: str

    modelVersion: str

    recommendationCount: int

    recommendations: list[CustomerRecommendation]