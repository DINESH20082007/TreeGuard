import { apiRequest } from './api';

export type ActionStatus = 'pending' | 'in-progress' | 'completed';
export type TimelineEventType = 'created' | 'assigned' | 'completed' | 'scheduled';

export interface RecoveryAction {
  id: string;
  label: string;
  note?: string | null;
  status: ActionStatus;
  assignee?: string | null;
  due?: string | null;
  completed_date?: string | null;
}

export interface RecoveryTimelineEvent {
  date: string;
  event: string;
  desc: string;
  type: TimelineEventType;
}

export interface RecoveryPlan {
  id: string;
  tree_id: string;
  tree_species?: string | null;
  tree_common_name?: string | null;
  tree_location?: string | null;
  tree_image_url?: string | null;
  tree_health_score?: number | null;
  tree_status?: string | null;
  creator_id: string;
  assigned_inspector_id?: string | null;
  assigned_inspector_name?: string | null;
  status: string;
  priority: string;
  severity: string;
  detected_issue: string;
  ai_assessment?: string | null;
  ai_confidence?: number | null;
  actions: RecoveryAction[];
  target_date?: string | null;
  reinspection_date?: string | null;
  notes?: string | null;
  timeline: RecoveryTimelineEvent[];
  created_at: string;
  updated_at?: string | null;
}

export interface CreateRecoveryPlanPayload {
  tree_id: string;
  priority: string;
  severity: string;
  assigned_inspector_name?: string;
  detected_issue?: string;
  ai_assessment?: string;
  ai_confidence?: number;
  actions: RecoveryAction[];
  target_date?: string;
  reinspection_date?: string;
  notes?: string;
}

export interface UpdateRecoveryPlanPayload {
  status?: string;
  priority?: string;
  severity?: string;
  assigned_inspector_name?: string;
  actions?: RecoveryAction[];
  target_date?: string;
  reinspection_date?: string;
  notes?: string;
}

export const recoveryPlansApi = {
  createPlan: (payload: CreateRecoveryPlanPayload): Promise<RecoveryPlan> => {
    return apiRequest<RecoveryPlan>('/api/recovery-plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getPlanById: (planId: string): Promise<RecoveryPlan> => {
    return apiRequest<RecoveryPlan>(`/api/recovery-plans/${encodeURIComponent(planId)}`, {
      method: 'GET',
    });
  },

  getPlanByTreeId: (treeId: string): Promise<RecoveryPlan> => {
    return apiRequest<RecoveryPlan>(`/api/trees/${encodeURIComponent(treeId)}/recovery-plan`, {
      method: 'GET',
    });
  },

  getTreePlans: (treeId: string): Promise<RecoveryPlan[]> => {
    return apiRequest<RecoveryPlan[]>(`/api/trees/${encodeURIComponent(treeId)}/recovery-plans`, {
      method: 'GET',
    });
  },

  updatePlan: (planId: string, payload: UpdateRecoveryPlanPayload): Promise<RecoveryPlan> => {
    return apiRequest<RecoveryPlan>(`/api/recovery-plans/${encodeURIComponent(planId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
