import { useAuth } from '../context/AuthContext';
import CitizenDashboard from './citizen/CitizenDashboard';
import InspectorDashboard from './inspector/InspectorDashboard';
import AdminDashboard from './admin/AdminDashboard';

export default function RoleDashboardDispatcher() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-forest-800">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'inspector') {
    return <InspectorDashboard />;
  }

  return <CitizenDashboard />;
}
