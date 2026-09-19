import { createBrowserRouter } from 'react-router';
import AppLayout from './layouts/AppLayout';
import PublicLayout from './layouts/PublicLayout';
import ProtectedRoute, { PublicOnlyRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import TreeMap from './pages/citizen/TreeMap';
import TreeDetail from './pages/citizen/TreeDetail';
import ReportTree from './pages/citizen/ReportTree';
import EmergencyDetection from './pages/citizen/EmergencyDetection';
import MyReports from './pages/citizen/MyReports';
import ReportDetail from './pages/citizen/ReportDetail';
import Notifications from './pages/citizen/Notifications';
import Profile from './pages/citizen/Profile';
import CreateRecoveryPlan from './pages/citizen/CreateRecoveryPlan';
import RecoveryPlanDetail from './pages/citizen/RecoveryPlanDetail';
import AIComparison from './pages/citizen/AIComparison';
import InspectorDashboard from './pages/inspector/InspectorDashboard';
import InspectionDetail from './pages/inspector/InspectionDetail';
import FollowUpObservation from './pages/inspector/FollowUpObservation';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import MonitoringDashboard from './pages/admin/MonitoringDashboard';
import RoleDashboardDispatcher from './pages/RoleDashboardDispatcher';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: PublicLayout,
    children: [
      { index: true, Component: Landing },
      {
        path: 'login',
        element: (
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <PublicOnlyRoute>
            <ResetPassword />
          </PublicOnlyRoute>
        ),
      },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <RoleDashboardDispatcher />
          </ProtectedRoute>
        ),
      },
      {
        path: 'map',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <TreeMap />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tree/:id',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <TreeDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tree/:id/create-recovery-plan',
        element: (
          <ProtectedRoute allowedRoles={['inspector', 'admin']}>
            <CreateRecoveryPlan />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tree/:id/recovery-plan',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <RecoveryPlanDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tree/:id/comparison',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <AIComparison />
          </ProtectedRoute>
        ),
      },
      {
        path: 'report',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <ReportTree />
          </ProtectedRoute>
        ),
      },
      {
        path: 'emergency',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <EmergencyDetection />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <MyReports />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports/:id',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <ReportDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <Notifications />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute allowedRoles={['citizen', 'inspector', 'admin']}>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'inspector',
        element: (
          <ProtectedRoute allowedRoles={['inspector', 'admin']}>
            <InspectorDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'inspector/followup/:id',
        element: (
          <ProtectedRoute allowedRoles={['inspector', 'admin']}>
            <FollowUpObservation />
          </ProtectedRoute>
        ),
      },
      {
        path: 'inspector/:id',
        element: (
          <ProtectedRoute allowedRoles={['inspector', 'admin']}>
            <InspectionDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/analytics',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Analytics />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/monitoring',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'inspector']}>
            <MonitoringDashboard />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);


