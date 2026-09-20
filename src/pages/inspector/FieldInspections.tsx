import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { inspectorApi, InspectorAssignment } from '../../services/inspector';

export default function FieldInspections() {
  const [assignments, setAssignments] = useState<InspectorAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadInspections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inspectorApi.getAssignments();
      setAssignments(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load field inspections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  // Active inspections are anything not fully resolved/completed
  const activeInspections = assignments.filter(
    (a) => a.status !== 'completed' || a.inspection_status === 'In Progress' || a.inspection_status === 'Follow-up Required'
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Field Inspections</h1>
          <p className="text-gray-500 text-sm">Active on-site visual audits, structural risk evaluations, and arborist field assessments</p>
        </div>
        <Link
          to="/app/inspector"
          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition self-start"
        >
          ← Inspector Dashboard
        </Link>
      </div>

      {loading && (
        <div className="p-12 text-center text-gray-400 text-sm animate-pulse">Loading active field inspections...</div>
      )}

      {error && (
        <div className="p-6 text-center text-red-600 text-sm bg-red-50 rounded-xl border border-red-100">{error}</div>
      )}

      {!loading && activeInspections.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500 text-sm shadow-sm">
          No pending on-site field inspections in your active queue.
        </div>
      )}

      {!loading && activeInspections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeInspections.map((a) => {
            const isInProgress = a.inspection_status === 'In Progress';
            return (
              <div
                key={a.id}
                onClick={() => navigate(`/app/inspector/${a.id}`)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-mono text-gray-400 font-semibold">{a.id}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isInProgress ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {a.inspection_status || 'Assigned'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{a.title || `Inspection ${a.id}`}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">📍 {a.location_name}</p>
                  {a.ai_assessment && (
                    <div className="mt-3 bg-forest-50/70 border border-forest-100 rounded-lg p-2.5 text-xs text-forest-800">
                      <span className="font-semibold block mb-0.5 text-[10px] text-forest-600 uppercase">AI Pre-Audit</span>
                      {a.ai_assessment}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Tree: {a.tree_id || 'N/A'}</span>
                  <Link
                    to={`/app/inspector/${a.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 bg-forest-800 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 transition"
                  >
                    Open Inspection →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
