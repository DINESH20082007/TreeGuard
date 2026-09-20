import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import StatusBadge from '../../components/StatusBadge';
import { inspectorApi, InspectorAssignment } from '../../services/inspector';

const priorityColors: Record<string, string> = {
  Emergency: 'text-red-600 bg-red-50 border-red-100',
  High: 'text-red-600 bg-red-50 border-red-100',
  Medium: 'text-amber-600 bg-amber-50 border-amber-100',
  Low: 'text-gray-500 bg-gray-100 border-gray-200',
};

export default function AssignmentsList() {
  const [assignments, setAssignments] = useState<InspectorAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [search, setSearch] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inspectorApi.getAssignments();
      setAssignments(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load field assignments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleStartInspection = async (assignmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(assignmentId);
    try {
      const updated = await inspectorApi.updateWorkflow(assignmentId, {
        action: 'start_inspection',
        inspection_status: 'In Progress',
      });
      setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? updated : a)));
      navigate(`/app/inspector/${assignmentId}`);
    } catch (err: any) {
      alert(err?.message || 'Could not start inspection.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = assignments.filter((a) => {
    if (filter === 'pending' && a.status === 'completed') return false;
    if (filter === 'in-progress' && a.inspection_status !== 'In Progress') return false;
    if (filter === 'completed' && a.status !== 'completed' && a.inspection_status !== 'Inspection Completed') return false;

    const query = search.toLowerCase().trim();
    if (!query) return true;
    return (
      a.id.toLowerCase().includes(query) ||
      (a.title && a.title.toLowerCase().includes(query)) ||
      (a.location_name && a.location_name.toLowerCase().includes(query)) ||
      (a.tree_id && a.tree_id.toLowerCase().includes(query))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Field Assignments Queue</h1>
          <p className="text-gray-500 text-sm">All assigned cases, inspection tasks, and physical maintenance work orders</p>
        </div>
        <button
          onClick={loadAssignments}
          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition cursor-pointer"
        >
          🔄 Refresh Queue
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by assignment ID, tree, or street..."
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(['all', 'pending', 'in-progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition cursor-pointer ${
                filter === f ? 'bg-forest-800 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-gray-400 text-sm animate-pulse">Loading inspector assignments...</div>
        )}
        {error && (
          <div className="p-6 text-center text-red-600 text-sm bg-red-50 border-b border-red-100">{error}</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-gray-500 text-sm">
            No assignments match the specified filter criteria.
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Case / ID</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Inspection Status</th>
                  <th className="py-3.5 px-4">Service Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => {
                  const isAssigned = !a.inspection_status || a.inspection_status === 'Assigned';
                  const isInProgress = a.inspection_status === 'In Progress';
                  const isCompleted = a.status === 'completed' || a.inspection_status === 'Inspection Completed';

                  return (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/app/inspector/${a.id}`)}
                      className="hover:bg-gray-50/60 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {a.image_url ? (
                            <img
                              src={a.image_url.startsWith('http') ? a.image_url : `http://127.0.0.1:8000${a.image_url}`}
                              alt="Tree"
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                              🌳
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{a.title || `Case ${a.id}`}</p>
                            <p className="text-xs font-mono text-gray-400">{a.id} · {a.tree_id || 'Tree'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        📍 {a.location_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            priorityColors[a.priority] || 'text-gray-600 bg-gray-50 border-gray-200'
                          }`}
                        >
                          {a.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-medium text-gray-800">{a.inspection_status || 'Assigned'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-gray-500">{a.service_status || 'Not Required'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isAssigned ? (
                          <button
                            type="button"
                            disabled={actionLoadingId === a.id}
                            onClick={(e) => handleStartInspection(a.id, e)}
                            className="px-3 py-1.5 bg-forest-800 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 transition cursor-pointer"
                          >
                            {actionLoadingId === a.id ? 'Starting…' : 'Start Inspection'}
                          </button>
                        ) : isInProgress ? (
                          <Link
                            to={`/app/inspector/${a.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition inline-block"
                          >
                            Record Findings
                          </Link>
                        ) : (
                          <Link
                            to={`/app/inspector/${a.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition inline-block"
                          >
                            View Case
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
