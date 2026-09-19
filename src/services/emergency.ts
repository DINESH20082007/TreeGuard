import { apiRequest } from './api';

export type EmergencyAnalysisStatus = 'completed' | 'unavailable' | 'inconclusive' | 'failed';
export type EmergencySeverity = 'High' | 'Medium' | 'Low' | 'None' | 'Unknown';

export interface EmergencyAnalysisResponse {
  id: string;
  user_id: string;
  report_id?: string | null;
  tree_id?: string | null;
  image_url: string;
  analysis_status: EmergencyAnalysisStatus;
  is_ai_available: boolean;
  emergency_detected: boolean;
  severity: EmergencySeverity;
  confidence: number;
  detected_issue: string;
  explanation: string;
  recommended_action: string;
  detected_conditions: string[];
  risk_factors: string[];
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export const emergencyApi = {
  analyze: (formData: FormData): Promise<EmergencyAnalysisResponse> => {
    return apiRequest<EmergencyAnalysisResponse>('/api/emergency/analyze', {
      method: 'POST',
      body: formData,
    });
  },

  getMyAnalyses: (): Promise<EmergencyAnalysisResponse[]> => {
    return apiRequest<EmergencyAnalysisResponse[]>('/api/emergency/my', {
      method: 'GET',
    });
  },

  getAnalysisById: (analysisId: string): Promise<EmergencyAnalysisResponse> => {
    return apiRequest<EmergencyAnalysisResponse>(`/api/emergency/${encodeURIComponent(analysisId)}`, {
      method: 'GET',
    });
  },
};
