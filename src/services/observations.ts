import { apiRequest } from './api';

export interface ObservationCreateRequest {
  tree_id: string;
  assignment_id?: string | null;
  recovery_plan_id?: string | null;
  condition?: string;
  health_score?: number | null;
  image_url?: string | null;
  notes?: string | null;
  recommendations?: string | null;
  canopy_condition?: string | null;
  structural_condition?: string | null;
  severity?: string | null;
  follow_up_required?: boolean;
  next_follow_up_date?: string | null;
  plan_status_update?: string | null;
  ai_assessment?: string | null;
  ai_confidence?: number | null;
}

export interface ObservationResponse {
  id: string;
  tree_id: string;
  tree_species?: string | null;
  tree_common_name?: string | null;
  tree_location_name?: string | null;
  inspector_id: string;
  inspector_name: string;
  assignment_id?: string | null;
  recovery_plan_id?: string | null;
  observation_date: string;
  image_url?: string | null;
  condition: string;
  health_score?: number | null;
  previous_health_score?: number | null;
  score_change?: number | null;
  change_category?: string | null;
  canopy_condition?: string | null;
  structural_condition?: string | null;
  severity?: string | null;
  notes?: string | null;
  recommendations?: string | null;
  ai_assessment?: string | null;
  ai_confidence?: number | null;
  follow_up_required: boolean;
  next_follow_up_date?: string | null;
  plan_status_update?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObservationComparisonResponse {
  tree_id: string;
  tree_species: string;
  tree_common_name: string;
  tree_location: string;
  previous_score?: number | null;
  current_score?: number | null;
  score_change?: number | null;
  change_category: 'improved' | 'stable' | 'deterioration' | 'inconclusive';
  label: string;
  label_color: string;
  bg_color: string;
  border_color: string;
  observation_summary: string;
  next_action: string;
  ai_confidence: number;
  previous_date?: string | null;
  current_date?: string | null;
  previous_image_url?: string | null;
  current_image_url?: string | null;
}

export const observationsApi = {
  createObservation: (data: ObservationCreateRequest): Promise<ObservationResponse> => {
    return apiRequest<ObservationResponse>('/api/observations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getObservationById: (observationId: string): Promise<ObservationResponse> => {
    return apiRequest<ObservationResponse>(`/api/observations/${encodeURIComponent(observationId)}`);
  },

  getTreeObservations: (treeId: string): Promise<ObservationResponse[]> => {
    return apiRequest<ObservationResponse[]>(`/api/trees/${encodeURIComponent(treeId)}/observations`);
  },

  getObservationComparison: (treeId: string): Promise<ObservationComparisonResponse> => {
    return apiRequest<ObservationComparisonResponse>(`/api/trees/${encodeURIComponent(treeId)}/comparison`);
  },

  getPlanObservations: (planId: string): Promise<ObservationResponse[]> => {
    return apiRequest<ObservationResponse[]>(`/api/recovery-plans/${encodeURIComponent(planId)}/observations`);
  },
};
