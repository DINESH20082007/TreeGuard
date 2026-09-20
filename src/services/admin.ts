import { apiRequest } from './api';

export interface AdminTopCard {
  label: string;
  value: string;
  delta: string;
  icon: string;
  color: string;
}

export interface HealthDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface EmergencyOverTimeItem {
  month: string;
  count: number;
}

export interface HealthTrendItem {
  month: string;
  healthy: number;
  atRisk: number;
}

export interface ResponseTimeItem {
  category: string;
  hours: number;
}

export interface ActiveEmergencyItem {
  id: string;
  issue: string;
  location: string;
  severity: string;
  inspector: string;
  status: string;
  created_at?: string;
}

export interface RecentReportItem {
  id: string;
  title: string;
  location_name: string;
  issue_type: string;
  priority: string;
  status: string;
  created_at: string;
}

export interface RecentInspectionItem {
  id: string;
  title: string;
  tree_id?: string | null;
  location_name: string;
  priority: string;
  inspection_status: string;
  service_status: string;
  completed_at?: string | null;
}

export interface TreesBreakdown {
  total: number;
  healthy: number;
  monitoring: number;
  at_risk: number;
  emergency: number;
}

export interface ReportsBreakdown {
  total: number;
  pending: number;
  under_review: number;
  resolved: number;
}

export interface EmergenciesBreakdown {
  total: number;
  open: number;
  resolved: number;
}

export interface InspectionsBreakdown {
  total: number;
  completed: number;
  pending: number;
  follow_up_required: number;
}

export interface ServicesBreakdown {
  required: number;
  in_progress: number;
  completed: number;
}

export interface MonitoringBreakdown {
  active_plans: number;
  total_plans: number;
  total_observations: number;
}

export interface AdminSummary {
  total_trees: number;
  healthy_trees: number;
  at_risk_trees: number;
  emergency_trees: number;
  total_reports: number;
  pending_reports: number;
  active_emergencies: number;
  completed_inspections: number;
  total_observations: number;
  total_recovery_plans: number;
}

export interface AdminDashboardResponse {
  organization_name: string;
  current_date: string;
  top_cards: AdminTopCard[];
  health_distribution: HealthDistributionItem[];
  emergency_over_time: EmergencyOverTimeItem[];
  health_trend: HealthTrendItem[];
  response_time: ResponseTimeItem[];
  active_emergencies: ActiveEmergencyItem[];
  summary: AdminSummary;
  trees_breakdown?: TreesBreakdown;
  reports_breakdown?: ReportsBreakdown;
  emergencies_breakdown?: EmergenciesBreakdown;
  inspections_breakdown?: InspectionsBreakdown;
  services_breakdown?: ServicesBreakdown;
  monitoring_breakdown?: MonitoringBreakdown;
  recent_reports?: RecentReportItem[];
  recent_inspections?: RecentInspectionItem[];
}

export interface MonitoringHealthTrendItem {
  date: string;
  improving: number;
  stable: number;
  deteriorating: number;
}

export interface MonitoringPlanStatusItem {
  name: string;
  count: number;
}

export interface UpcomingReinspectionItem {
  treeId: string;
  species: string;
  location: string;
  date: string;
  inspector: string;
  status: string;
  daysLeft: number;
}

export interface AttentionTreeItem {
  id: string;
  species: string;
  change: number;
  priority: string;
  issue: string;
}

export interface MonitoringDashboardResponse {
  organization_name: string;
  current_date: string;
  summary_cards: AdminTopCard[];
  health_trend: MonitoringHealthTrendItem[];
  plan_status: MonitoringPlanStatusItem[];
  upcoming_reinspections: UpcomingReinspectionItem[];
  attention_trees: AttentionTreeItem[];
}

export interface UserManagementItem {
  id: string;
  full_name: string;
  email: string;
  role: 'citizen' | 'inspector' | 'admin';
  is_active: boolean;
  primary_district?: string;
  phone_number?: string | null;
  created_at: string;
  assigned_count: number;
  reports_count: number;
}

export interface OrganizationSettingsResponse {
  organization_name: string;
  jurisdiction: string;
  emergency_sla_hours: number;
  auto_assignment_enabled: boolean;
  triage_model: string;
  dispatch_email: string;
  primary_contact: string;
  last_updated?: string;
}

export interface OrganizationSettingsUpdate {
  organization_name?: string;
  jurisdiction?: string;
  emergency_sla_hours?: number;
  auto_assignment_enabled?: boolean;
  dispatch_email?: string;
  primary_contact?: string;
}

export const adminApi = {
  getDashboard: () =>
    apiRequest<AdminDashboardResponse>('/api/admin/dashboard', {
      method: 'GET',
    }),
  getMonitoring: () =>
    apiRequest<MonitoringDashboardResponse>('/api/admin/monitoring', {
      method: 'GET',
    }),
  getUsers: () =>
    apiRequest<UserManagementItem[]>('/api/admin/users', {
      method: 'GET',
    }),
  updateUserStatus: (userId: string, payload: { is_active?: boolean; role?: string }) =>
    apiRequest<UserManagementItem>(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getSettings: () =>
    apiRequest<OrganizationSettingsResponse>('/api/admin/settings', {
      method: 'GET',
    }),
  updateSettings: (payload: OrganizationSettingsUpdate) =>
    apiRequest<OrganizationSettingsResponse>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

