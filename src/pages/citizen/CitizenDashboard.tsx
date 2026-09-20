import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { reportsApi, Report } from '../../services/reports';
import { treesApi, Tree } from '../../services/trees';
import { notificationsApi, NotificationItem } from '../../services/notifications';

const priorityColors: Record<string, string> = {
  Emergency: 'text-red-600 bg-red-50 border-red-100',
  High: 'text-red-600 bg-red-50 border-red-100',
  Medium: 'text-amber-600 bg-amber-50 border-amber-100',
  Low: 'text-gray-500 bg-gray-100 border-gray-200',
};

const issueLabels: Record<string, string> = {
  health: 'Tree health concern',
  fallen: 'Fallen tree / road blockage',
  branch: 'Broken / hanging branch',
  trunk: 'Trunk split / decay',
  storm: 'Severe storm damage',
  blocking: 'Blocking sidewalk / roadway',
  infrastructure: 'Powerline / building conflict',
  other: 'General tree concern',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTreeImage(tree: Tree): string {
  if (tree.image_url) {
    return tree.image_url.startsWith('http') ? tree.image_url : `http://127.0.0.1:8000${tree.image_url}`;
  }
  const s = (tree.species || tree.common_name || '').toLowerCase();
  if (s.includes('elm')) {
    return 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=160&h=160&fit=crop&auto=format';
  }
  if (s.includes('oak')) {
    return 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=160&h=160&fit=crop&auto=format';
  }
  if (s.includes('neem') || s.includes('banyan') || s.includes('peepal')) {
    return 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=160&h=160&fit=crop&auto=format';
  }
  return 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=160&h=160&fit=crop&auto=format';
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const displayName = user?.full_name || 'Citizen';
  const greeting = getGreeting();

  const [reports, setReports] = useState<Report[]>([]);
  const [nearbyTrees, setNearbyTrees] = useState<Tree[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCitizenData() {
      setLoading(true);
      setError(null);
      try {
        const [myReports, allTrees, notifData, unreadRes] = await Promise.all([
          reportsApi.getMyReports().catch(() => []),
          treesApi.getTrees().catch(() => []),
          notificationsApi.getNotifications().catch(() => ({ notifications: [], total: 0, unread_count: 0 })),
          notificationsApi.getUnreadCount().catch(() => ({ unread_count: 0 })),
        ]);

        if (isMounted) {
          setReports(myReports || []);
          setNearbyTrees(allTrees || []);
          setNotifications(notifData.notifications || []);
          setUnreadCount(unreadRes.unread_count || 0);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Unable to load citizen dashboard data.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCitizenData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real calculations from user's authenticated reports
  const totalReportsCount = reports.length;
  const activeReports = reports.filter((r) => r.status !== 'resolved' && r.status !== 'completed');
  const activeReportsCount = activeReports.length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved' || r.status === 'completed');
  const resolvedReportsCount = resolvedReports.length;

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const inFlightCount = activeReportsCount - pendingCount;

  // Real calculations from nearby tree registry
  const attentionTrees = nearbyTrees.filter(
    (t) =>
      t.status === 'at-risk' ||
      t.status === 'emergency' ||
      t.status === 'monitoring' ||
      (t.health_score !== undefined && t.health_score < 70)
  );
  const emergencyNearbyTrees = nearbyTrees.filter((t) => t.status === 'emergency' || (t.health_score !== undefined && t.health_score < 40));

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const recentReports = reports.slice(0, 5);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* 1. Welcome & Citizen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-forest-100 text-forest-800 tracking-wide uppercase">
              Citizen Portal
            </span>
            <span className="text-xs text-gray-400 font-mono">Coimbatore Urban Canopy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {greeting}, {displayName}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {currentDateStr} · {user?.primary_district || 'RS Puram & West Zone'} · Community Tree Steward
          </p>
        </div>

        {/* Primary Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/app/report"
            className="bg-forest-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-forest-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <span>+</span>
            <span>Report a Tree</span>
          </Link>
          <Link
            to="/app/map"
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
          >
            <span>🗺️</span>
            <span>Explore Tree Map</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 2. Citizen 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: My Reports */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">My Reports</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
              📋
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {loading ? '…' : totalReportsCount}
          </p>
          <p className="text-xs text-gray-500">
            {totalReportsCount === 1 ? '1 total submission' : `${totalReportsCount} total submissions`}
          </p>
        </div>

        {/* Card 2: Active Reports */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Reports</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
              ⏳
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 mb-1">
            {loading ? '…' : activeReportsCount}
          </p>
          <p className="text-xs text-gray-500">
            {activeReportsCount > 0
              ? `${pendingCount} in review · ${inFlightCount} assigned`
              : 'All submissions resolved'}
          </p>
        </div>

        {/* Card 3: Resolved Reports */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Resolved Reports</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
              ✓
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mb-1">
            {loading ? '…' : resolvedReportsCount}
          </p>
          <p className="text-xs text-gray-500">
            {resolvedReportsCount > 0 ? 'Field care completed' : 'No closed reports yet'}
          </p>
        </div>

        {/* Card 4: Nearby Tree Alerts */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Nearby Tree Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm font-bold">
              🚨
            </div>
          </div>
          <p className="text-3xl font-bold text-forest-800 mb-1">
            {loading ? '…' : attentionTrees.length}
          </p>
          <p className="text-xs text-gray-500">
            {attentionTrees.length > 0 ? `${attentionTrees.length} trees need monitoring` : 'Canopy in good condition'}
          </p>
        </div>
      </div>

      {/* 3. Main Two-Column Layout: Nearby Tree Risks & Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Nearby Tree Risks (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Nearby Tree Risks & Safety Watch</h2>
              <p className="text-xs text-gray-400">Trees in your neighborhood requiring arborist attention</p>
            </div>
            <Link to="/app/map" className="text-xs text-forest-700 hover:text-forest-800 font-bold transition">
              Explore Tree Map →
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center space-y-2 my-auto">
              <div className="w-6 h-6 border-2 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400">Loading nearby tree health registry...</p>
            </div>
          ) : attentionTrees.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 my-auto">
              No critical tree risks reported in your immediate neighborhood.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {attentionTrees.slice(0, 4).map((tree) => {
                const healthScore = tree.health_score ?? 75;
                const isCritical = tree.status === 'emergency' || healthScore < 50;
                const isAtRisk = tree.status === 'at-risk' || (healthScore >= 50 && healthScore < 70);

                return (
                  <div key={tree.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                    <img
                      src={getTreeImage(tree)}
                      alt={tree.species}
                      className="w-14 h-14 rounded-xl object-cover bg-gray-100 flex-shrink-0 border border-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-gray-400 font-mono font-bold">{tree.id}</span>
                        <StatusBadge status={tree.status} dot />
                        <span className="text-xs text-gray-500 font-medium italic">({tree.species})</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {tree.common_name || tree.species}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{tree.location_name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isCritical
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : isAtRisk
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-forest-50 text-forest-700 border border-forest-100'
                          }`}
                        >
                          Health: {healthScore}/100 · {isCritical ? 'Critical Risk' : isAtRisk ? 'At Risk' : 'Monitoring'}
                        </span>
                        {tree.last_inspection && (
                          <span className="text-[11px] text-gray-400">
                            Last Inspected:{' '}
                            <strong className="text-gray-600 font-normal">
                              {new Date(tree.last_inspection).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Link
                        to={`/app/tree/${tree.id}`}
                        className="text-xs bg-forest-50 text-forest-700 hover:bg-forest-100 px-3.5 py-2 rounded-lg font-bold transition-colors inline-block"
                      >
                        View Tree →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions & Emergency Panel (Right 1 col) */}
        <div className="space-y-4">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Citizen Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                to="/app/report"
                className="p-3 bg-forest-50 hover:bg-forest-100 text-forest-800 rounded-xl font-bold text-center transition-colors flex flex-col items-center gap-1.5 shadow-2xs"
              >
                <span className="text-lg">📝</span>
                <span>Report a Tree</span>
              </Link>
              <Link
                to="/app/map"
                className="p-3 bg-forest-50 hover:bg-forest-100 text-forest-800 rounded-xl font-bold text-center transition-colors flex flex-col items-center gap-1.5 shadow-2xs"
              >
                <span className="text-lg">🗺️</span>
                <span>Explore Map</span>
              </Link>
              <Link
                to="/app/emergency"
                className="p-3 bg-red-50 hover:bg-red-100 text-red-800 rounded-xl font-bold text-center transition-colors flex flex-col items-center gap-1.5 shadow-2xs"
              >
                <span className="text-lg">🚨</span>
                <span>Emergency AI</span>
              </Link>
              <Link
                to="/app/reports"
                className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold text-center transition-colors flex flex-col items-center gap-1.5 shadow-2xs"
              >
                <span className="text-lg">📑</span>
                <span>My Reports</span>
              </Link>
            </div>
          </div>

          {/* Emergency Detection Banner */}
          <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-xl p-5 text-white shadow-sm space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
              <h3 className="font-bold text-sm">Emergency Hazard Detection</h3>
            </div>
            <p className="text-red-100 text-xs leading-relaxed">
              Fallen tree across the road or broken limb on power lines? Submit immediate telemetry for rapid arborist dispatch.
            </p>
            <Link
              to="/app/emergency"
              className="inline-block bg-white text-red-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
            >
              Launch Emergency AI →
            </Link>
          </div>
        </div>
      </div>

      {/* 5. My Recent Reports (Citizen's Own Submissions) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">My Recent Reports</h2>
            <p className="text-xs text-gray-400">Live operational lifecycle of your submitted tree concerns</p>
          </div>
          <Link to="/app/reports" className="text-xs text-forest-700 hover:text-forest-800 font-bold">
            View All Reports ({totalReportsCount}) →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">
            <div className="w-5 h-5 border-2 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading your report history...
          </div>
        ) : recentReports.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-400 space-y-3">
            <div className="text-3xl">🌱</div>
            <p className="font-semibold text-gray-700">You haven't submitted any tree reports yet.</p>
            <p className="text-gray-400">Help protect your community's urban canopy by reporting damaged or hazardous trees.</p>
            <Link
              to="/app/report"
              className="inline-block text-xs bg-forest-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-forest-800 transition-colors shadow-sm"
            >
              Report a Tree Now →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-gray-50/40">
                  <th className="text-left px-6 py-3 font-semibold">Report ID</th>
                  <th className="text-left px-6 py-3 font-semibold">Issue Category</th>
                  <th className="text-left px-6 py-3 font-semibold">Location</th>
                  <th className="text-left px-6 py-3 font-semibold">Submitted</th>
                  <th className="text-left px-6 py-3 font-semibold">Priority</th>
                  <th className="text-left px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentReports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-700">{r.id}</td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">{issueLabels[r.issue_type] || r.issue_type}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{r.location_name}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(r.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${priorityColors[r.priority] || 'text-gray-600 bg-gray-100 border-gray-200'}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/app/reports/${r.id}`}
                        className="text-xs text-forest-700 hover:text-forest-800 font-bold transition"
                      >
                        View Report →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Notifications Feed */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm">Recent Alerts & Notifications</h2>
            <Link to="/app/notifications" className="text-xs text-forest-700 hover:text-forest-800 font-bold">
              View All Notifications ({unreadCount} unread) →
            </Link>
          </div>
          <div className="space-y-2.5">
            {notifications.slice(0, 3).map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border text-xs transition-colors ${
                  !notif.read ? 'bg-forest-50/50 border-forest-100' : 'bg-gray-50/60 border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-gray-800">{notif.title}</p>
                  <span className="text-[11px] text-gray-400 flex-shrink-0 font-mono">
                    {new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
