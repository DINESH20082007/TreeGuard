from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class AnalyticsKpiCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str
    value: str
    sub: str
    color: str

class HealthTrendPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    period: str
    healthy: float
    atRisk: float

class DistributionSlice(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    value: float
    color: str

class CategoryCount(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    count: int

class GeographicHotspot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    area: str
    emergencies: int
    atRisk: int
    trend: str  # 'up' | 'down' | 'stable'

class EnvironmentalInsight(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    icon: str
    title: str
    desc: str
    severity: str

class AnalyticsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    range: str
    range_label: str
    kpis: List[AnalyticsKpiCard]
    health_trend: List[HealthTrendPoint]
    current_distribution: List[DistributionSlice]
    emergency_categories: List[CategoryCount]
    hotspots: List[GeographicHotspot]
    insights: List[EnvironmentalInsight]
