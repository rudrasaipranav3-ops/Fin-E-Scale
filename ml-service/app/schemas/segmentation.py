from pydantic import BaseModel, Field


class CustomerFeatures(BaseModel):
    customerId: str

    recency: float = Field(ge=0)
    frequency: float = Field(ge=0)
    monetary: float = Field(ge=0)
    averageOrderValue: float = Field(ge=0)


class SegmentationRequest(BaseModel):
    customers: list[CustomerFeatures]


class CustomerSegmentResult(BaseModel):
    customerId: str
    cluster: int
    segmentName: str


class SegmentationResponse(BaseModel):
    success: bool
    clusterCount: int
    customers: list[CustomerSegmentResult]