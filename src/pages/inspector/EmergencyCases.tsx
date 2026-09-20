import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { inspectorApi, InspectorAssignment } from '../../services/inspector';

export default function EmergencyCases() {
  const [assignments, setAssignments] = useState<InspectorAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadEmergencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inspectorApi.getAssignments();
      setAssignments(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load emergency cases.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmergencies();
  }, [loadEmergencies]);

  const emergencyCases = assignments.filter(
    (a) => a.priority === 'Emergency' || a.priority === 'High' || a.status === 'emergency'
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Critical Hazard Queue</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Emergency Cases</h1>
          <p className="text-gray-500 text-sm">Fallen trees, road obstructions, broken branches, and structural hazard response</p>
        </div>
        <Link
          to="/app/inspector"
          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition self-start"
        >
          ← Inspector Dashboard
        </Link>
      </div>

      {loading && (
        <div className="p-12 text-center text-gray-400 text-sm animate-pulse">Loading emergency assignments...</div>
      )}

      {error && (
        <div className="p-6 text-center text-red-600 text-sm bg-red-50 rounded-xl border border-red-100">{error}</div>
      )}

      {!loading && emergencyCases.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500 text-sm shadow-sm">
          No critical emergency cases currently assigned. All high-priority hazards handled.
        </div>
      )}

      {!loading && emergencyCases.length > 0 && (
        <div className="space-y-4">
          {emergencyCases.map((a) => {
            const isCrit = a.priority === 'Emergency' || a.status === 'emergency';
            return (
              <div
                key={a.id}
                onClick={() => navigate(`/app/inspector/${a.id}`)}
                className={`p-5 rounded-xl border transition-all cursor-pointer bg-white shadow-sm hover:shadow-md ${
                  isCrit ? 'border-red-200 hover:border-red-300' : 'border-amber-200 hover:border-amber-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        isCrit ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      🚨
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold text-gray-400">{a.id}</span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isCrit ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {a.priority}
                        </span>
                        <span className="text-xs text-gray-400">· Status: {a.inspection_status || 'Assigned'}</span>
                      </div>
                      <h3 className="font-bold text-base text-gray-900">{a.title || 'Emergency Tree Hazard'}</h3>
                      <p className="text-xs text-gray-600 mt-1">📍 {a.location_name}</p>
                      {a.ai_assessment && (
                        <p className="text-xs text-forest-700 mt-1.5 font-medium">🤖 {a.ai_assessment}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Link
                      to={`/app/inspector/${a.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition shadow-xs"
                    >
                      Inspect Case Now →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
