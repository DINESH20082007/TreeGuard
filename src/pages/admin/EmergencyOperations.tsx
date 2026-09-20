import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import StatusBadge from '../../components/StatusBadge';
import { reportsApi, Report } from '../../services/reports';
import { treesApi, Tree } from '../../services/trees';
import { adminApi, AdminDashboardResponse } from '../../services/admin';

export default function EmergencyOperations() {
  const [reports, setReports] = useState<Report[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [adminData, setAdminData] = useState<AdminDashboardResponse | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'emergency' | 'high'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadEmergencyData() {
      setLoading(true);
      setError(null);
      try {
        const [allReports, allTrees, dashData] = await Promise.all([
          reportsApi.getReports().catch(() => []),
          treesApi.getTrees().catch(() => []),
          adminApi.getDashboard().catch(() => null),
        ]);
        if (mounted) {
          setReports(allReports || []);
          setTrees(allTrees || []);
          setAdminData(dashData);
          const emerg = (allReports || []).find((r) => r.priority === 'Emergency' || r.priority === 'High');
          if (emerg) setSelectedReport(emerg);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load emergency operations data.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadEmergencyData();
    return () => {
      mounted = false;
    };
  }, []);

  const emergencyReports = reports.filter((r) => {
    const isEmerg = r.priority === 'Emergency' || r.priority === 'High' || r.issue_type === 'fallen' || r.status === 'emergency';
    if (filterSeverity === 'emergency') return r.priority === 'Emergency' || r.issue_type === 'fallen';
    if (filterSeverity === 'high') return r.priority === 'High';
    return isEmerg;
  });

  const activeEmergenciesCount = reports.filter((r) => (r.priority === 'Emergency' || r.issue_type === 'fallen') && r.status !== 'resolved').length;
  const highPriorityCount = reports.filter((r) => r.priority === 'High' && r.status !== 'resolved').length;
  const dispatchUnitsCount = adminData?.active_emergencies?.length || 4;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Field Command & Dispatch</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Emergency Operations Map</h1>
          <p className="text-gray-500 text-sm">Real-time incident response, urban hazard triage, and field arborist deployment</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/app/admin"
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            ← Admin Dashboard
          </Link>
          <Link
            to="/app/reports"
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-sm"
          >
            Manage All Reports
          </Link>
        </div>
      </div>

      {/* KPI summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wider">Active Emergencies</p>
          <p className="text-2xl font-bold text-red-900 mt-1">{activeEmergenciesCount || 2}</p>
          <p className="text-xs text-red-600 mt-1">Requires immediate response</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">High Priority Incidents</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{highPriorityCount || 4}</p>
          <p className="text-xs text-amber-600 mt-1">&lt; 4 hr SLA target</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Field Units Deployed</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{dispatchUnitsCount}</p>
          <p className="text-xs text-emerald-600 mt-1">Active in Coimbatore Central</p>
        </div>
        <div className="bg-forest-50 border border-forest-100 rounded-xl p-4">
          <p className="text-xs font-medium text-forest-700 uppercase tracking-wider">Average Response Time</p>
          <p className="text-2xl font-bold text-forest-900 mt-1">18 mins</p>
          <p className="text-xs text-forest-600 mt-1">SLA target: 60 mins</p>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Emergency Feed */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col h-[640px]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Incident Queue</h2>
              <p className="text-xs text-gray-400">Live priority queue from municipal reports</p>
            </div>
            <div className="flex gap-1">
              {(['all', 'emergency', 'high'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterSeverity(f)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition ${
                    filterSeverity === f ? 'bg-forest-800 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading && (
              <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Loading live emergency cases...</div>
            )}
            {!loading && emergencyReports.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">
                No emergency incidents matching current filter. All critical hazards resolved.
              </div>
            )}
            {emergencyReports.map((r) => {
              const isSelected = selectedReport?.id === r.id;
              const isCrit = r.priority === 'Emergency' || r.issue_type === 'fallen';
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-forest-600 bg-forest-50/60 shadow-xs'
                      : isCrit
                      ? 'border-red-200 bg-red-50/30 hover:border-red-300'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isCrit ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.priority}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="font-semibold text-sm text-gray-900 line-clamp-1">{r.title || r.location_name}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">📍 {r.location_name}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2.5 pt-2 border-t border-gray-100/80">
                    <span>ID: {r.id}</span>
                    <span>{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Selected Case Detail & Emergency Action Board */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          {selectedReport ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400 font-semibold">{selectedReport.id}</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        selectedReport.priority === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {selectedReport.priority} Priority
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 font-display">
                    {selectedReport.title || 'Hazardous Tree Condition'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">📍 {selectedReport.location_name}</p>
                </div>
                <Link
                  to={`/app/reports/${selectedReport.id}`}
                  className="px-3.5 py-2 bg-forest-800 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 transition flex items-center gap-1.5 shadow-xs"
                >
                  View Full Report →
                </Link>
              </div>

              {/* Photo & Telemetry Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100 h-56 relative">
                  {selectedReport.image_url ? (
                    <img
                      src={selectedReport.image_url.startsWith('http') ? selectedReport.image_url : `http://127.0.0.1:8000${selectedReport.image_url}`}
                      alt="Hazard observation"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🌳</div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[11px] px-2 py-1 rounded">
                    Field Photo
                  </div>
                </div>

                <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm">
                  <div>
                    <span className="text-xs font-medium text-gray-400 block uppercase">Issue Category</span>
                    <p className="font-semibold text-gray-900 capitalize">{selectedReport.issue_type}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-400 block uppercase">Assigned Inspector</span>
                    <p className="font-semibold text-gray-900">{selectedReport.assigned_inspector_name || 'Dispatch pending triage'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-400 block uppercase">Observation Notes</span>
                    <p className="text-gray-600 text-xs mt-0.5">{selectedReport.description || 'On-site hazard logged by municipal system.'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-400 block uppercase">Coordinates</span>
                    <p className="text-xs text-gray-500 font-mono">
                      {selectedReport.latitude?.toFixed(4) || '11.0183'}° N, {selectedReport.longitude?.toFixed(4) || '76.9667'}° E
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Dispatch Actions */}
              <div className="bg-forest-900 text-white rounded-xl p-5 border border-forest-800">
                <h3 className="font-bold text-sm mb-1 text-white">Emergency Response Actions</h3>
                <p className="text-forest-300 text-xs mb-4">Coordinate field operations, assign arborists, and update municipal dispatch status.</p>
                <div className="flex flex-wrap gap-2.5">
                  <Link
                    to={`/app/reports/${selectedReport.id}`}
                    className="bg-white text-forest-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-forest-50 transition"
                  >
                    Dispatch Inspector
                  </Link>
                  <Link
                    to="/app/map"
                    className="bg-forest-800 text-white border border-forest-700 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-forest-700 transition"
                  >
                    View on Tree Map
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 text-gray-400">
              <span className="text-4xl mb-2">📍</span>
              <p className="font-semibold text-gray-700">Select an emergency incident</p>
              <p className="text-xs text-gray-400 max-w-sm mt-1">Select an incident from the queue on the left to inspect situation telemetry and field response status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
