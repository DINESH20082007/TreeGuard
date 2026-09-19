import { apiRequest } from './api';

export type Range = '7d' | '30d' | '90d' | '1y';

export interface AnalyticsKpiCard {
  label: string;
  value: string;
  sub: string;
  color: string;
}

export interface HealthTrendPoint {
  period: string;
  healthy: number;
  atRisk: number;
}

export interface DistributionSlice {
  name: string;
  value: number;
  color: string;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface GeographicHotspot {
  area: string;
  emergencies: number;
  atRisk: number;
  trend: 'up' | 'down' | 'stable' | string;
}

export interface EnvironmentalInsight {
  icon: string;
  title: string;
  desc: string;
  severity: string;
}

export interface AnalyticsResponse {
  range: string;
  range_label: string;
  kpis: AnalyticsKpiCard[];
  health_trend: HealthTrendPoint[];
  current_distribution: DistributionSlice[];
  emergency_categories: CategoryCount[];
  hotspots: GeographicHotspot[];
  insights: EnvironmentalInsight[];
}

export const analyticsApi = {
  getAnalytics: (range: Range = '90d') =>
    apiRequest<AnalyticsResponse>(`/api/analytics?range=${range}`, {
      method: 'GET',
    }),
};
