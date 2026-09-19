import { apiRequest } from './api';

export type TreeStatus = 'healthy' | 'monitoring' | 'at-risk' | 'emergency';

export interface Tree {
  id: string;
  species: string;
  common_name: string;
  latitude: number;
  longitude: number;
  status: TreeStatus;
  health_score: number;
  health_confidence?: number | null;
  image_url?: string | null;
  location_name: string;
  last_inspection: string;
  height_m?: number | null;
  canopy_spread_m?: number | null;
  created_at: string;
  updated_at: string;
}

export interface TreeFilters {
  status?: string;
  search?: string;
  limit?: number;
}

export interface RiskFactor {
  factor: string;
  value: string;
}

export interface RiskHistoryItem {
  period: string;
  risk: string;
}

export interface TreeRiskResponse {
  tree_id: string;
  future_risk: string;
  prediction_horizon: string;
  prediction_confidence?: number | null;
  assessment: string;
  risk_factors: RiskFactor[];
  risk_explanation: string;
  recommended_action: string;
  risk_history?: RiskHistoryItem[] | null;
  trend?: string | null;
  is_inconclusive?: boolean;
}

export const treesApi = {
  getTrees: (filters?: TreeFilters): Promise<Tree[]> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      params.append('search', filters.search.trim());
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }

    const queryString = params.toString();
    const endpoint = `/api/trees${queryString ? `?${queryString}` : ''}`;
    return apiRequest<Tree[]>(endpoint, { method: 'GET' });
  },

  getTreeById: (treeId: string): Promise<Tree> => {
    return apiRequest<Tree>(`/api/trees/${encodeURIComponent(treeId)}`, { method: 'GET' });
  },

  getTreeRisk: (treeId: string): Promise<TreeRiskResponse> => {
    return apiRequest<TreeRiskResponse>(`/api/trees/${encodeURIComponent(treeId)}/risk`, { method: 'GET' });
  },

  getTreeInspections: (treeId: string): Promise<any[]> => {
    return apiRequest<any[]>(`/api/trees/${encodeURIComponent(treeId)}/inspections`, { method: 'GET' });
  },
};


