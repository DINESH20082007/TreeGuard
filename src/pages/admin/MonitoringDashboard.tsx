import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { adminApi, MonitoringDashboardResponse } from '../../services/admin';

export default function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonitoring = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getMonitoring();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load monitoring dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitoring();
  }, [fetchMonitoring]);

  if (loading && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-pulse">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-7 w-64 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-48 bg-gray-100 rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-gray-100 rounded-lg"></div>
            <div className="h-9 w-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm h-24 flex flex-col justify-between">
              <div className="h-3 w-20 bg-gray-100 rounded"></div>
              <div className="h-7 w-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-64"></div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-64"></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-semibold mb-2">Unable to Load Monitoring Dashboard</p>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchMonitoring}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summaryCards = data?.summary_cards || [];
  const healthTrend = data?.health_trend || [];
  const planStatus = data?.plan_status || [];
  const upcomingReinspections = data?.upcoming_reinspections || [];
  const attentionTrees = data?.attention_trees || [];
  const overdueCount = upcomingReinspections.filter((r) => r.status === 'overdue').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/app/admin" className="text-sm text-gray-400 hover:text-gray-600">Admin</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900">Tree Recovery & Monitoring</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Tree Recovery & Monitoring</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {data?.organization_name || 'City Parks & Urban Forestry Division'} · {data?.current_date}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/admin/analytics" className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Analytics
          </Link>
          <Link to="/app/map" className="text-sm bg-forest-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors">
            Monitoring Map
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium leading-tight">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <p className={`text-2xl font-semibold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-5">Health Trend Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={healthTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="improving" stroke="#16a34a" strokeWidth={2} dot={false} name="Improving" />
              <Line type="monotone" dataKey="stable" stroke="#3b82f6" strokeWidth={2} dot={false} name="Stable" />
              <Line type="monotone" dataKey="deteriorating" stroke="#dc2626" strokeWidth={2} dot={false} name="Deteriorating" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-5">Recovery Plan Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={planStatus} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" fill="#2d6a4f" radius={[0, 4, 4, 0]} name="Plans" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming re-inspections */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Upcoming Re-inspections</h3>
          {overdueCount > 0 && (
            <span className="text-xs text-red-600 bg-red-50 font-medium px-2 py-0.5 rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </div>
        {upcomingReinspections.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            No scheduled re-inspections currently pending in the registry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-6 py-3 font-medium">Tree</th>
                  <th className="text-left px-6 py-3 font-medium">Location</th>
                  <th className="text-left px-6 py-3 font-medium">Scheduled</th>
                  <th className="text-left px-6 py-3 font-medium">Inspector</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {upcomingReinspections.map((r) => (
                  <tr key={r.treeId} className={`hover:bg-gray-50/50 transition-colors ${r.status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-mono text-xs text-gray-400">{r.treeId}</p>
                      <p className="font-medium text-gray-800 text-sm">{r.species}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.location}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-800">{r.date}</p>
                      {r.status === 'overdue' && <p className="text-xs text-red-600 font-medium">Overdue by {Math.abs(r.daysLeft)} days</p>}
                      {r.status === 'scheduled' && <p className="text-xs text-gray-400">In {r.daysLeft} days</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.inspector}</td>
                    <td className="px-6 py-4">
                      {r.status === 'overdue' ? (
                        <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>
                      ) : (
                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Scheduled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/app/tree/${r.treeId}/recovery-plan`} className="text-xs text-forest-600 hover:text-forest-700 font-medium">
                        View plan →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trees requiring attention */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Trees Requiring Attention</h3>
          <p className="text-xs text-gray-400 mt-0.5">Based on AI assessment score changes and overdue inspections</p>
        </div>
        {attentionTrees.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            No trees currently flagged for urgent arborist intervention.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {attentionTrees.map((tree) => (
              <div key={tree.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center text-xl flex-shrink-0">
                  ↓
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-gray-400">{tree.id}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tree.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {tree.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{tree.species}</p>
                  <p className="text-xs text-gray-500">{tree.issue}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-semibold text-red-600">{tree.change}</p>
                  <p className="text-xs text-gray-400">Score change</p>
                </div>
                <Link to={`/app/tree/${tree.id}`} className="text-xs bg-forest-700 text-white px-3 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors flex-shrink-0">
                  View tree
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
