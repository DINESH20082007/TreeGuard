import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import StatusBadge from '../../components/StatusBadge';
import { reportsApi, Report } from '../../services/reports';

type Tab = 'all' | 'pending' | 'under-review' | 'assigned' | 'in-progress' | 'resolved';

const tabs: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All Reports' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in-progress', label: 'In Progress & Field Work' },
  { value: 'resolved', label: 'Resolved' },
];

const issueLabels: Record<string, string> = {
  health: 'Tree health concern',
  fallen: 'Fallen tree / road blockage',
  branch: 'Broken branch',
  trunk: 'Trunk damage',
  storm: 'Severe storm damage',
  blocking: 'Blocking sidewalk / roadway',
  infrastructure: 'Near infrastructure',
  other: 'General tree concern',
};

const priorityColors: Record<string, string> = {
  Emergency: 'text-red-700 bg-red-50 border-red-200',
  High: 'text-red-700 bg-red-50 border-red-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-gray-600 bg-gray-100 border-gray-200',
};

function matchesTab(reportStatus: string, tab: Tab): boolean {
  const st = reportStatus.toLowerCase();
  if (tab === 'all') return true;
  if (tab === 'pending') return st === 'pending';
  if (tab === 'under-review') return st === 'under-review';
  if (tab === 'assigned') return st === 'assigned';
  if (tab === 'in-progress') {
    return [
      'in-progress',
      'inspection-in-progress',
      'inspection-completed',
      'service-required',
      'service-in-progress',
      'service-completed',
      'follow-up-required',
    ].includes(st);
  }
  if (tab === 'resolved') return st === 'resolved' || st === 'completed';
  return st === tab;
}

export default function MyReports() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getMyReports();
      setReports(data || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your reports. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formattedReports = reports.map((r) => ({
    id: r.id,
    img: r.image_url
      ? r.image_url.startsWith('http')
        ? r.image_url
        : `http://127.0.0.1:8000${r.image_url}`
      : 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=80&h=80&fit=crop&auto=format',
    issue: issueLabels[r.issue_type] || r.issue_type,
    location: r.location_name,
    date: new Date(r.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    priority: r.priority || 'Medium',
    status: r.status,
    assignedInspector: r.assigned_inspector_name,
    workPerformed: r.work_performed,
    serviceCompletedAt: r.service_completed_at,
  }));

  const filtered = formattedReports.filter((r) => matchesTab(r.status, activeTab));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-forest-100 text-forest-800 uppercase tracking-wider">
              Citizen Reports
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? 'Loading reports...' : `${reports.length} total reports submitted`}
          </p>
        </div>
        <Link
          to="/app/report"
          className="text-sm bg-forest-700 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors inline-flex items-center gap-1.5 shadow-sm"
        >
          <span>+</span> Report a Tree
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-gray-100/80 p-1.5 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const count = reports.filter((r) => matchesTab(r.status, tab.value)).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                activeTab === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              {tab.label}
              {!loading && count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === tab.value
                      ? 'bg-forest-100 text-forest-800'
                      : 'bg-gray-200/70 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-forest-50 text-forest-600 mb-3 animate-pulse">
            <div className="w-6 h-6 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Loading your reports...</h3>
          <p className="text-gray-400 text-xs">Fetching real-time submission and inspection states from database.</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
            ⚠️
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Failed to load reports</h3>
          <p className="text-gray-500 text-xs max-w-md mx-auto mb-4">{error}</p>
          <button
            onClick={() => fetchReports()}
            className="text-xs bg-forest-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-forest-800 transition shadow-sm cursor-pointer"
          >
            ↻ Try again
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 px-4 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="font-semibold text-gray-900 text-base mb-1">No reports submitted yet</h3>
          <p className="text-gray-500 text-xs max-w-md mx-auto mb-6 leading-relaxed">
            You haven't submitted any tree reports yet. If you spot a fallen tree, broken branch, or health hazard in your neighborhood, submit a report to alert municipal crews.
          </p>
          <Link
            to="/app/report"
            className="inline-flex items-center gap-2 text-xs bg-forest-700 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-forest-800 transition shadow-sm"
          >
            + Report a Tree
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-800 text-sm mb-1">No reports in this category</h3>
          <p className="text-gray-400 text-xs">Your submitted reports matching this filter will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/60 font-semibold">
                  <th className="px-6 py-3.5">Report ID & Issue</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Submitted</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Current Lifecycle Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={r.img}
                          alt=""
                          className="w-11 h-11 rounded-lg object-cover bg-gray-100 flex-shrink-0 border border-gray-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=80&h=80&fit=crop&auto=format';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-gray-400 font-semibold">{r.id}</p>
                          <p className="font-semibold text-gray-900 truncate">{r.issue}</p>
                          {r.assignedInspector && (
                            <p className="text-[11px] text-purple-700">Inspector: {r.assignedInspector}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{r.location}</td>
                    <td className="px-6 py-4 text-gray-500">{r.date}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          priorityColors[r.priority] || priorityColors.Medium
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={r.status} dot />
                        {(r.status === 'resolved' || r.workPerformed) && (
                          <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-100 flex items-center gap-1">
                            <span>✓</span> Work Completed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/app/reports/${encodeURIComponent(r.id)}`}
                        className="text-xs text-forest-700 hover:text-forest-800 font-semibold transition"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to={`/app/reports/${encodeURIComponent(r.id)}`}
                className="flex items-center gap-3.5 px-4 py-4 hover:bg-gray-50/60 transition-colors"
              >
                <img
                  src={r.img}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover bg-gray-100 flex-shrink-0 border border-gray-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=80&h=80&fit=crop&auto=format';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-gray-400 font-medium">{r.id}</span>
                    <StatusBadge status={r.status} dot />
                    {(r.status === 'resolved' || r.workPerformed) && (
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded font-medium border border-emerald-100">
                        ✓ Work Done
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-xs truncate">{r.issue}</p>
                  <p className="text-[11px] text-gray-500 truncate">{r.location}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{r.date}</p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
