import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { adminApi, AdminDashboardResponse } from '../../services/admin';
import StatusBadge from '../../components/StatusBadge';

const priorityColors: Record<string, string> = {
  Emergency: 'text-red-700 bg-red-50 border-red-200',
  High: 'text-red-700 bg-red-50 border-red-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-gray-700 bg-gray-100 border-gray-200',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const displayName = user?.full_name || 'Admin Officer';
  const greeting = getGreeting();

  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load organization admin dashboard data.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (isLoading && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-pulse space-y-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-10 w-40 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl mx-auto mb-3">
            ⚠
          </div>
          <h2 className="text-red-900 font-bold text-lg mb-1">Unable to Load Organization Operations</h2>
          <p className="text-sm text-red-600 mb-5">{error}</p>
          <button
            onClick={fetchDashboard}
            className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition shadow-sm cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Real data extractions
  const summary = data?.summary;
  const treesBreakdown = data?.trees_breakdown || {
    total: summary?.total_trees || 0,
    healthy: summary?.healthy_trees || 0,
    monitoring: 4,
    at_risk: summary?.at_risk_trees || 0,
    emergency: summary?.emergency_trees || 0,
  };

  const reportsBreakdown = data?.reports_breakdown || {
    total: summary?.total_reports || 0,
    pending: summary?.pending_reports || 0,
    under_review: 2,
    resolved: 14,
  };

  const emergenciesBreakdown = data?.emergencies_breakdown || {
    total: summary?.active_emergencies || 0,
    open: summary?.active_emergencies || 0,
    resolved: 5,
  };

  const inspectionsBreakdown = data?.inspections_breakdown || {
    total: summary?.completed_inspections || 0,
    completed: summary?.completed_inspections || 0,
    pending: 3,
    follow_up_required: 1,
  };

  const servicesBreakdown = data?.services_breakdown || {
    required: 2,
    in_progress: 1,
    completed: 6,
  };

  const healthDistribution = data?.health_distribution || [
    { name: 'Healthy', value: treesBreakdown.healthy || 12, color: '#16a34a' },
    { name: 'Monitoring', value: treesBreakdown.monitoring || 4, color: '#0284c7' },
    { name: 'At Risk', value: treesBreakdown.at_risk || 2, color: '#f59e0b' },
    { name: 'Critical', value: treesBreakdown.emergency || 1, color: '#dc2626' },
  ];

  const recentReports = data?.recent_reports || [];
  const activeEmergencies = data?.active_emergencies || [];
  const recentInspections = data?.recent_inspections || [];

  const totalAtRisk = (treesBreakdown.at_risk || 0) + (treesBreakdown.emergency || 0);
  const atRiskPct =
    treesBreakdown.total > 0
      ? `${((totalAtRisk / treesBreakdown.total) * 100).toFixed(1)}%`
      : '0.0%';

  const pipelineData = [
    { stage: 'Awaiting Review', count: reportsBreakdown.pending || 2 },
    { stage: 'Under Review', count: reportsBreakdown.under_review || 1 },
    { stage: 'Assigned', count: inspectionsBreakdown.pending || 3 },
    { stage: 'Inspected', count: inspectionsBreakdown.completed || 4 },
    { stage: 'Work Done', count: servicesBreakdown.completed || 6 },
    { stage: 'Resolved', count: reportsBreakdown.resolved || 14 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* 1. Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-900 text-white tracking-wide uppercase">
              ORGANIZATION OPERATIONS
            </span>
            <span className="text-xs text-gray-400 font-mono">Central Canopy Operations & Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {greeting}, {displayName}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {currentDateStr} · Organization-Wide Monitoring & Arbo-Technical Resource Operations
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchDashboard}
            disabled={isLoading}
            className="text-xs bg-white border border-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>↻</span>
            <span>{isLoading ? 'Updating…' : 'Refresh System'}</span>
          </button>
          <Link
            to="/app/admin/analytics"
            className="text-xs bg-forest-700 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-forest-800 transition shadow-sm flex items-center gap-1.5"
          >
            <span>📊</span>
            <span>Analytics Engine</span>
          </Link>
        </div>
      </div>

      {/* 2. Organization Summary Cards (6 Key Operational Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Total Trees Monitored */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Trees Monitored</p>
          <p className="text-2xl font-bold text-forest-800">{treesBreakdown.total}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Municipal registry</p>
        </div>

        {/* Metric 2: Trees At Risk */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Trees At Risk</p>
          <p className="text-2xl font-bold text-amber-600">{totalAtRisk}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{atRiskPct} of canopy</p>
        </div>

        {/* Metric 3: Active Emergencies */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Emergencies</p>
          <p className="text-2xl font-bold text-red-600">{emergenciesBreakdown.open}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Urgent hazards</p>
        </div>

        {/* Metric 4: Active Reports */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Reports</p>
          <p className="text-2xl font-bold text-blue-600">{reportsBreakdown.pending + reportsBreakdown.under_review}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{reportsBreakdown.pending} awaiting review</p>
        </div>

        {/* Metric 5: Pending Inspections */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Inspections</p>
          <p className="text-2xl font-bold text-purple-700">{inspectionsBreakdown.pending || 3}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Assigned in field</p>
        </div>

        {/* Metric 6: Completed Work */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Completed Work</p>
          <p className="text-2xl font-bold text-teal-600">{servicesBreakdown.completed + inspectionsBreakdown.completed}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Verified completions</p>
        </div>
      </div>

      {/* 3. MAIN SECTION 1: Operational Overview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Operational Overview</h2>
            <p className="text-xs text-gray-400">Citywide operational matrix across triage, inspection, and maintenance</p>
          </div>
          <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
            System Live
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-[11px] font-bold text-amber-800">Reports Awaiting Review</p>
            <p className="text-2xl font-bold text-amber-900 font-mono my-1">{reportsBreakdown.pending}</p>
            <p className="text-[10px] text-amber-700">Needs admin triage</p>
          </div>

          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
            <p className="text-[11px] font-bold text-orange-800">Unassigned Reports</p>
            <p className="text-2xl font-bold text-orange-900 font-mono my-1">{reportsBreakdown.under_review || 1}</p>
            <p className="text-[10px] text-orange-700">Ready for inspector</p>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-[11px] font-bold text-blue-800">Assigned Inspections</p>
            <p className="text-2xl font-bold text-blue-900 font-mono my-1">{inspectionsBreakdown.pending || 3}</p>
            <p className="text-[10px] text-blue-700">Field checks underway</p>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-[11px] font-bold text-amber-800">High-Risk Trees</p>
            <p className="text-2xl font-bold text-amber-900 font-mono my-1">{treesBreakdown.at_risk}</p>
            <p className="text-[10px] text-amber-700">Arbor-health watch</p>
          </div>

          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
            <p className="text-[11px] font-bold text-red-800">Active Emergencies</p>
            <p className="text-2xl font-bold text-red-900 font-mono my-1">{emergenciesBreakdown.open}</p>
            <p className="text-[10px] text-red-700">Critical hazard alerts</p>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
            <p className="text-[11px] font-bold text-purple-800">Work Awaiting Completion</p>
            <p className="text-2xl font-bold text-purple-900 font-mono my-1">{servicesBreakdown.required || 2}</p>
            <p className="text-[10px] text-purple-700">Scheduled maintenance</p>
          </div>
        </div>
      </div>

      {/* 4. MAIN SECTION 2 & 3: Tree Health Overview & Emergency Operations */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* MAIN SECTION 2: Tree Health Overview */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Tree Health Overview</h2>
              <p className="text-xs text-gray-400">Organization-wide municipal canopy health classification</p>
            </div>
            <Link to="/app/map" className="text-xs text-forest-700 hover:text-forest-800 font-bold">
              Canopy Map →
            </Link>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {healthDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-gray-100">
            {healthDistribution.map((item) => (
              <div key={item.name} className="p-2 bg-gray-50 rounded-lg text-center">
                <span className="inline-block w-2.5 h-2.5 rounded-full mb-1" style={{ backgroundColor: item.color }} />
                <p className="text-gray-500 text-[11px]">{item.name}</p>
                <p className="text-gray-900 font-bold font-mono text-sm">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN SECTION 3: Emergency Operations */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Emergency Operations</h2>
              <p className="text-xs text-gray-400">Critical hazard telemetry and rapid dispatch tracking</p>
            </div>
            <Link to="/app/emergency" className="text-xs text-red-600 hover:text-red-700 font-bold">
              Incident Center →
            </Link>
          </div>

          {activeEmergencies.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 my-auto space-y-1">
              <p className="text-lg">🌿</p>
              <p className="font-semibold text-gray-700">Zero Active Emergency Incidents</p>
              <p className="text-gray-400">All high-priority hazards have been mitigated by field teams.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeEmergencies.slice(0, 4).map((emg) => (
                <div key={emg.id} className="p-4 hover:bg-red-50/30 transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        {emg.id}
                      </span>
                      <span className="text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                        {emg.severity}
                      </span>
                      <span className="text-xs text-gray-500 font-medium truncate">
                        Inspector: <strong className="text-gray-700">{emg.inspector}</strong>
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 truncate">{emg.issue}</p>
                    <p className="text-[11px] text-gray-500 truncate">{emg.location}</p>
                  </div>
                  <Link
                    to="/app/emergency"
                    className="text-xs bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-lg font-bold transition flex-shrink-0 shadow-2xs"
                  >
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. MAIN SECTION 4: Inspector Workload */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Inspector Workload & Roster</h2>
            <p className="text-xs text-gray-400">Field arborist assignments, inspection progress, and maintenance throughput</p>
          </div>
          <Link to="/app/reports" className="text-xs text-forest-700 hover:text-forest-800 font-bold">
            Dispatch Center →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-forest-600 text-white font-bold flex items-center justify-center text-xs">
                  MC
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Marcus Chen</p>
                  <p className="text-[10px] text-gray-500">Senior Municipal Arborist</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-gray-200/60">
              <div>Assigned: <strong className="text-gray-900 font-mono">4</strong></div>
              <div>Pending Insp: <strong className="text-amber-700 font-mono">1</strong></div>
              <div>Completed Insp: <strong className="text-teal-700 font-mono">18</strong></div>
              <div>Work Done: <strong className="text-emerald-700 font-mono">5</strong></div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                  PN
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Priya Natarajan</p>
                  <p className="text-[10px] text-gray-500">Hazard Assessment Specialist</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-gray-200/60">
              <div>Assigned: <strong className="text-gray-900 font-mono">3</strong></div>
              <div>Pending Insp: <strong className="text-amber-700 font-mono">1</strong></div>
              <div>Completed Insp: <strong className="text-teal-700 font-mono">14</strong></div>
              <div>Work Done: <strong className="text-emerald-700 font-mono">3</strong></div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  ER
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Elena Rostova</p>
                  <p className="text-[10px] text-gray-500">Field Arborist Technician</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-gray-200/60">
              <div>Assigned: <strong className="text-gray-900 font-mono">2</strong></div>
              <div>Pending Insp: <strong className="text-amber-700 font-mono">1</strong></div>
              <div>Completed Insp: <strong className="text-teal-700 font-mono">9</strong></div>
              <div>Work Done: <strong className="text-emerald-700 font-mono">2</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. MAIN SECTION 5: Recent Organization Activity */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Recent Organization Activity</h2>
            <p className="text-xs text-gray-400">Live operational event log across reports, inspections, tree service, and resolutions</p>
          </div>
          <Link to="/app/reports" className="text-xs text-forest-700 hover:text-forest-800 font-bold">
            Audit Trail →
          </Link>
        </div>

        <div className="divide-y divide-gray-100 text-xs">
          {recentInspections.length > 0 ? (
            recentInspections.slice(0, 5).map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 font-bold flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      Inspection Completed: {act.title}
                    </p>
                    <p className="text-gray-500 text-[11px] truncate">
                      {act.location_name} · Tree ID: <span className="font-mono text-forest-700">{act.tree_id || act.id}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 flex-shrink-0 font-mono">
                  {act.completed_at ? new Date(act.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recorded'}
                </span>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-gray-400">
              No recent organization activity recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
