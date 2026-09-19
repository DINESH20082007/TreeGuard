import { apiRequest } from './api';

export type ReportStatus =
  | 'pending'
  | 'under-review'
  | 'assigned'
  | 'in-progress'
  | 'inspection-in-progress'
  | 'inspection-completed'
  | 'service-required'
  | 'service-in-progress'
  | 'service-completed'
  | 'follow-up-required'
  | 'resolved'
  | 'rejected'
  | string;

export type ReportPriority = 'High' | 'Medium' | 'Low' | string;

export interface ReportStatusHistoryItem {
  id: string;
  report_id: string;
  status: string;
  stage_name: string;
  note?: string | null;
  created_at: string;
}

export interface ReportTimelineStepItem {
  label: string;
  status: 'completed' | 'current' | 'pending' | string;
  date?: string | null;
  timestamp?: string | null;
  note?: string | null;
  done: boolean;
}

export interface Report {
  id: string;
  reporter_id: string;
  tree_id?: string | null;
  issue_type: string;
  description?: string | null;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url: string;
  priority: ReportPriority;
  status: ReportStatus;
  observed_at?: string | null;
  additional_notes?: string | null;
  assigned_inspector_id?: string | null;
  assigned_inspector_name?: string | null;
  reviewed_at?: string | null;
  assigned_at?: string | null;
  inspection_started_at?: string | null;
  inspection_completed_at?: string | null;
  service_started_at?: string | null;
  service_completed_at?: string | null;
  resolved_at?: string | null;
  work_performed?: string | null;
  completion_notes?: string | null;
  status_history?: ReportStatusHistoryItem[];
  timeline?: ReportTimelineStepItem[];
  created_at: string;
  updated_at: string;
}

export interface ReportSubmitResponse {
  id: string;
  status: string;
  created_at: string;
  image_url: string;
  message: string;
}

export interface ReportAssignPayload {
  inspector_id: string;
  notes?: string;
  priority?: string;
  due_date?: string;
}

export interface InspectorOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export const reportsApi = {
  createReport: (formData: FormData): Promise<ReportSubmitResponse> => {
    return apiRequest<ReportSubmitResponse>('/api/reports', {
      method: 'POST',
      body: formData,
    });
  },

  getMyReports: (): Promise<Report[]> => {
    return apiRequest<Report[]>('/api/reports/my', {
      method: 'GET',
    });
  },

  getAllReports: (): Promise<Report[]> => {
    return apiRequest<Report[]>('/api/reports', {
      method: 'GET',
    });
  },

  getReportById: (reportId: string): Promise<Report> => {
    return apiRequest<Report>(`/api/reports/${encodeURIComponent(reportId)}`, {
      method: 'GET',
    });
  },

  getInspectors: (): Promise<InspectorOption[]> => {
    return apiRequest<InspectorOption[]>('/api/reports/inspectors/list', {
      method: 'GET',
    });
  },

  reviewReport: (reportId: string, notes?: string): Promise<Report> => {
    return apiRequest<Report>(`/api/reports/${encodeURIComponent(reportId)}/review`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  assignInspector: (reportId: string, payload: ReportAssignPayload): Promise<Report> => {
    return apiRequest<Report>(`/api/reports/${encodeURIComponent(reportId)}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  startInspection: (reportId: string, notes?: string): Promise<Report> => {
    return apiRequest<Report>(`/api/reports/${encodeURIComponent(reportId)}/start-inspection`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  completeInspection: (
    reportId: string,
    payload: {
      condition?: string;
      severity?: string;
      notes?: string;
      recommended_action?: string;
      service_required?: boolean;
    }
  ): Promise<Report> => {
    return apiRequest<Report>(`/api/reports/${encodeURIComponent(reportId)}/complete-inspection`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  completeWork: (
    reportId: string,
    payload: {
      work_performed: string;
      completion_notes?: string;
    }
  ): Promise<Report> => {
    return apiRequest<Report>(`/api/reports/${encodeURIComponent(reportId)}/complete-work`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  completeReport: (
    reportId: string,
    payload?: {
      notes?: string;
      work_performed?: string;
    }
  ): Promise<Report> => {
    return apiRequest<Report>(`/api/reports/${encodeURIComponent(reportId)}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },
};
