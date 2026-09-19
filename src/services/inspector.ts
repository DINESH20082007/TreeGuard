import { apiRequest } from './api';

export type AssignmentPriority = 'Emergency' | 'High' | 'Medium' | 'Low';
export type AssignmentStatus = 'assigned' | 'in-progress' | 'completed' | 'pending' | 'under-review' | 'emergency';
export type InspectionStatus = 'Assigned' | 'In Progress' | 'Inspection Completed' | 'Follow-up Required';
export type ServiceStatus = 'Not Required' | 'Required' | 'Service In Progress' | 'Service Completed';

export interface InspectorAssignment {
  id: string;
  inspector_id: string;
  report_id?: string | null;
  tree_id?: string | null;
  title: string;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  inspection_status: InspectionStatus;
  service_required: boolean;
  service_status: ServiceStatus;
  service_performed?: string | null;
  service_notes?: string | null;
  service_completed_at?: string | null;
  work_performed?: string | null;
  completion_notes?: string | null;
  inspection_started_at?: string | null;
  inspection_completed_at?: string | null;
  ai_assessment?: string | null;
  notes?: string | null;
  assigned_at: string;
  due_date?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface InspectorStats {
  assigned_today: number;
  high_priority: number;
  pending_inspection: number;
  completed_this_week: number;
  emergency_cases: number;
  service_required?: number;
  service_in_progress?: number;
  service_completed?: number;
}

export interface AssignmentWorkflowPayload {
  action?: 'start_inspection' | 'complete_inspection' | 'follow_up_required' | 'start_service' | 'complete_service' | 'complete_work' | 'update_service' | 'mark_service_completed';
  inspection_status?: InspectionStatus;
  service_required?: boolean;
  service_status?: ServiceStatus;
  condition?: string;
  severity?: string;
  notes?: string;
  recommended_action?: string;
  service_performed?: string;
  service_notes?: string;
  work_performed?: string;
  completion_notes?: string;
}

export const inspectorApi = {
  getAssignments: (): Promise<InspectorAssignment[]> => {
    return apiRequest<InspectorAssignment[]>('/api/inspector/assignments', {
      method: 'GET',
    });
  },

  getStats: (): Promise<InspectorStats> => {
    return apiRequest<InspectorStats>('/api/inspector/stats', {
      method: 'GET',
    });
  },

  getAssignmentById: (assignmentId: string): Promise<InspectorAssignment> => {
    return apiRequest<InspectorAssignment>(`/api/inspector/assignments/${encodeURIComponent(assignmentId)}`, {
      method: 'GET',
    });
  },

  updateWorkflow: (
    assignmentId: string,
    payload: AssignmentWorkflowPayload
  ): Promise<InspectorAssignment> => {
    return apiRequest<InspectorAssignment>(`/api/inspector/assignments/${encodeURIComponent(assignmentId)}/workflow`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  completeAssignment: (
    assignmentId: string,
    payload: {
      condition: string;
      severity: string;
      notes?: string;
      recommended_action?: string;
      service_required?: boolean;
      service_status?: ServiceStatus;
      service_performed?: string;
      service_notes?: string;
    }
  ): Promise<InspectorAssignment> => {
    return apiRequest<InspectorAssignment>(`/api/inspector/assignments/${encodeURIComponent(assignmentId)}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};


