import { apiRequest } from './api';

export type UserRole = 'citizen' | 'inspector' | 'admin';

export interface UserNotificationPreferences {
  emergencyNearby?: boolean;
  reportUpdates?: boolean;
  treeAlerts?: boolean;
  weeklyDigest?: boolean;
  inspectionCompleted?: boolean;
  [key: string]: any;
}

export interface UserPrivacySettings {
  locationAccess?: boolean;
  anonymousReporting?: boolean;
  dataUsageForAI?: boolean;
  [key: string]: any;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone_number?: string | null;
  primary_district?: string | null;
  avatar_url?: string | null;
  notification_preferences?: UserNotificationPreferences | null;
  privacy_settings?: UserPrivacySettings | null;
  member_since?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserProfileUpdateRequest {
  full_name?: string;
  phone_number?: string;
  primary_district?: string;
  avatar_url?: string;
  notification_preferences?: UserNotificationPreferences;
  privacy_settings?: UserPrivacySettings;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiRequest<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () =>
    apiRequest<User>('/api/auth/me', {
      method: 'GET',
    }),

  getProfile: () =>
    apiRequest<User>('/api/users/me', {
      method: 'GET',
    }),

  updateProfile: (payload: UserProfileUpdateRequest) =>
    apiRequest<User>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: ChangePasswordPayload) =>
    apiRequest<MessageResponse>('/api/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    apiRequest<MessageResponse>('/api/auth/logout', {
      method: 'POST',
    }),

  forgotPassword: (email: string) =>
    apiRequest<MessageResponse>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    apiRequest<MessageResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),
};
