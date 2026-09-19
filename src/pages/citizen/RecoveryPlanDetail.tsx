import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { recoveryPlansApi, RecoveryPlan, RecoveryAction } from '../../services/recoveryPlans';
import { treesApi, Tree } from '../../services/trees';

const typeColors: Record<string, string> = {
  created: 'bg-forest-100 text-forest-700',
  assigned: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
};

const typeIcons: Record<string, string> = {
  created: '🌿',
  assigned: '👷',
  completed: '✓',
  scheduled: '📅',
};

const actionStatusConfig: Record<string, { label: string; classes: string; icon: string }> = {
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-700', icon: '✓' },
  'in-progress': { label: 'In progress', classes: 'bg-blue-100 text-blue-700', icon: '⟳' },
  pending: { label: 'Pending', classes: 'bg-gray-100 text-gray-500', icon: '○' },
};

export default function RecoveryPlanDetail() {
  const { id } = useParams();
  const treeId = id ?? 'TRE-0481';

  const [plan, setPlan] = useState<RecoveryPlan | null>(null);
  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchPlanData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First try to fetch by tree ID / plan ID
      let planData: RecoveryPlan | null = null;
      try {
        planData = await recoveryPlansApi.getPlanByTreeId(treeId);
      } catch (err: any) {
        if (err?.status === 404 && treeId.startsWith('REC-')) {
          planData = await recoveryPlansApi.getPlanById(treeId);
        } else {
          throw err;
        }
      }

      setPlan(planData);

      // Fetch corresponding tree details
      if (planData?.tree_id) {
        treesApi
          .getTreeById(planData.tree_id)
          .then((t) => setTree(t))
          .catch(() => {});
      }
    } catch (err: any) {
      if (err?.status !== 404) {
        setError(err?.message || 'Failed to load recovery plan. Please try again.');
      }
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  // Toggle or cycle action completion status
  const handleToggleActionStatus = async (actionId: string) => {
    if (!plan || updating) return;

    const currentActions = [...plan.actions];
    const targetIdx = currentActions.findIndex((a) => a.id === actionId);
    if (targetIdx === -1) return;

    const currentStatus = currentActions[targetIdx].status;
    let nextStatus: 'pending' | 'in-progress' | 'completed' = 'in-progress';
    let completedDate: string | null = null;

    if (currentStatus === 'pending') {
      nextStatus = 'in-progress';
    } else if (currentStatus === 'in-progress') {
      nextStatus = 'completed';
      completedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      nextStatus = 'pending';
    }

    currentActions[targetIdx] = {
      ...currentActions[targetIdx],
      status: nextStatus,
      completed_date: completedDate,
    };

    setUpdating(true);
    setActionSuccessMsg(null);
    try {
      const updated = await recoveryPlansApi.updatePlan(plan.id, {
        actions: currentActions,
      });
      setPlan(updated);
      setActionSuccessMsg('Action status updated successfully.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update action status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkPlanComplete = async () => {
    if (!plan || updating) return;
    setUpdating(true);
    try {
      const allCompletedActions = plan.actions.map((a) => ({
        ...a,
        status: 'completed' as const,
        completed_date:
          a.completed_date ||
          new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }));

      const updated = await recoveryPlansApi.updatePlan(plan.id, {
        status: 'Completed',
        actions: allCompletedActions,
      });
      setPlan(updated);
      setActionSuccessMsg('Recovery plan marked as complete.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to mark plan as complete.');
    } finally {
      setUpdating(false);
    }
  };

  const actionsList: RecoveryAction[] = plan?.actions || [];
  const completedCount = actionsList.filter((a) => a.status === 'completed').length;
  const totalCount = actionsList.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const actualTreeId = plan?.tree_id || treeId;
  const treeSpecies = tree?.species || plan?.tree_species || 'Urban Forestry Tree';
  const treeLocation = tree?.location_name || plan?.tree_location || 'Urban District';
  const treeImageUrl =
    tree?.image_url ||
    plan?.tree_image_url ||
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=300&fit=crop&auto=format';

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-24">
        <div className="w-12 h-12 border-4 border-forest-200 border-t-forest-700 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-700 font-medium text-base">Loading Recovery Plan…</p>
        <p className="text-gray-400 text-sm mt-1">Retrieving verified plan and actions from database</p>
      </div>
    );
  }

  // Empty State: No Plan Found for this tree
  if (!plan) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-12 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">No Active Recovery Plan</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          There is currently no recovery plan recorded for tree <strong className="font-mono text-gray-700">{actualTreeId}</strong>. You can formulate a tailored rehabilitation plan now.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to={`/app/tree/${actualTreeId}/create-recovery-plan`}
            className="bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors shadow-sm"
          >
            + Create Recovery Plan
          </Link>
          <Link
            to={`/app/tree/${actualTreeId}`}
            className="border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Back to Tree Detail
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={`/app/tree/${actualTreeId}`} className="hover:text-gray-600">
          Tree {actualTreeId}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Recovery Plan ({plan.id})</span>
      </div>

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="mb-4 p-3.5 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-green-600 hover:text-green-800 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold text-red-900">Operation Error</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-sm text-gray-400">{actualTreeId}</span>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                plan.status === 'Completed'
                  ? 'bg-green-100 text-green-700'
                  : plan.status === 'In Progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {plan.status}
            </span>
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2.5 py-0.5 rounded-full">
              Priority: {plan.priority}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 font-mono px-2 py-0.5 rounded-md">
              {plan.id}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Tree Recovery Plan</h1>
          <p className="text-gray-500 text-sm">
            {treeSpecies} · {treeLocation} · Created{' '}
            {new Date(plan.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            to={`/app/tree/${actualTreeId}`}
            className="text-sm border border-gray-200 text-gray-600 px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Tree Detail
          </Link>
          <Link
            to={`/app/tree/${actualTreeId}/comparison`}
            className="text-sm bg-forest-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors shadow-sm"
          >
            Compare Observations
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Plan progress</p>
          <p className="text-sm font-semibold text-forest-700">
            {completedCount} / {totalCount} actions complete ({progressPercent}%)
          </p>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-forest-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* A. Tree information */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-wider">
              A. Tree Information
            </h2>
            <div className="flex gap-4 items-center">
              <img
                src={treeImageUrl}
                alt={treeSpecies}
                className="w-20 h-20 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=300&fit=crop&auto=format';
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {actualTreeId} — {treeSpecies}
                </p>
                <p className="text-sm text-gray-500 mb-2 truncate">{treeLocation}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-gray-400 block">Condition</span>
                    <span className="font-medium text-amber-600 capitalize">
                      {tree?.status || plan.tree_status || 'At Risk'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Last Inspection</span>
                    <span className="font-medium text-gray-700">
                      {tree?.last_inspection || 'Recent'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Health Score</span>
                    <span className="font-medium text-gray-700">
                      {tree?.health_score ?? plan.tree_health_score ?? 70} / 100
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* B. AI Assessment */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-wider">
              B. AI Assessment
            </h2>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-4">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                AI Assessment — advisory determination
              </span>
              <p className="font-medium text-amber-800 mt-1">{plan.detected_issue}</p>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                {plan.ai_assessment ||
                  'Canopy thinning and premature leaf drop consistent with extended dry period or root zone compaction.'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'AI Confidence', value: `${plan.ai_confidence || 82}%` },
                { label: 'Severity', value: plan.severity },
                { label: 'Risk level', value: plan.priority },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="font-semibold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* C. Recommended actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-500 text-xs uppercase tracking-wider">
                C. Recommended Actions ({actionsList.length})
              </h2>
              <span className="text-xs text-gray-400">Click icon to advance status</span>
            </div>
            <div className="space-y-2">
              {actionsList.map((action) => {
                const cfg = actionStatusConfig[action.status] || actionStatusConfig.pending;
                return (
                  <div
                    key={action.id}
                    className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-2 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleActionStatus(action.id)}
                      disabled={updating}
                      title="Click to advance status"
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 cursor-pointer hover:scale-105 transition-transform ${cfg.classes}`}
                    >
                      {cfg.icon}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          action.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}
                      >
                        {action.label}
                      </p>
                      {action.note && (
                        <p className="text-xs text-amber-600 mt-0.5">{action.note}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {action.assignee || plan.assigned_inspector_name || 'Inspector'} · Due{' '}
                        {action.due || plan.target_date || 'Scheduled'}
                        {action.completed_date ? ` · Completed ${action.completed_date}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleActionStatus(action.id)}
                      disabled={updating}
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${cfg.classes}`}
                    >
                      {cfg.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* D. Maintenance timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-wider">
              D. Maintenance Timeline
            </h2>
            <div className="space-y-0">
              {(plan.timeline || []).map((e, i) => {
                const color = typeColors[e.type] || 'bg-gray-100 text-gray-700';
                const icon = typeIcons[e.type] || '•';
                return (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${color}`}>
                        {icon}
                      </div>
                      {i < plan.timeline.length - 1 && (
                        <div className="w-0.5 bg-gray-100 flex-1 my-1" style={{ minHeight: 24 }} />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <p className="text-xs text-gray-400 mb-0.5">{e.date}</p>
                      <p className="text-sm font-medium text-gray-900">{e.event}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{e.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* F. Notes & evidence */}
          {plan.notes && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-wider">
                F. Notes & Dispatch Instructions
              </h2>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {plan.assigned_inspector_name ? plan.assigned_inspector_name[0] : 'M'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-800">
                      {plan.assigned_inspector_name || 'Inspector Notes'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(plan.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{plan.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* E. Re-inspection */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              E. Re-inspection Schedule
            </p>
            <dl className="space-y-2.5">
              {[
                { term: 'Target date', desc: plan.target_date || 'Within 14 days' },
                { term: 'Re-inspection', desc: plan.reinspection_date || 'Within 30 days' },
                { term: 'Assigned inspector', desc: plan.assigned_inspector_name || 'Municipal Field Team' },
                { term: 'Notification alert', desc: 'Active (3 days prior)' },
              ].map((item) => (
                <div key={item.term} className="flex justify-between text-xs gap-2">
                  <dt className="text-gray-400 flex-shrink-0">{item.term}</dt>
                  <dd className="text-gray-700 font-medium text-right truncate">{item.desc}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3.5 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 leading-relaxed">
                Automatic reminder active. The assigned inspector will receive an alert prior to scheduled re-inspection.
              </p>
            </div>
          </div>

          {/* G. Status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              G. Current Status
            </p>
            <div className="space-y-2.5">
              {[
                {
                  label: 'Plan status',
                  value: plan.status,
                  color:
                    plan.status === 'Completed'
                      ? 'bg-green-100 text-green-700'
                      : plan.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700',
                },
                { label: 'Priority', value: plan.priority, color: 'bg-amber-100 text-amber-700' },
                { label: 'Severity', value: plan.severity, color: 'bg-yellow-100 text-yellow-700' },
                {
                  label: 'Last updated',
                  value: plan.updated_at
                    ? new Date(plan.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recent',
                  color: '',
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{item.label}</span>
                  {item.color ? (
                    <span className={`font-medium px-2 py-0.5 rounded-full ${item.color}`}>
                      {item.value}
                    </span>
                  ) : (
                    <span className="font-medium text-gray-700">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2.5">
            <Link
              to={`/app/tree/${actualTreeId}/comparison`}
              className="block w-full text-center text-xs font-medium py-2.5 bg-forest-700 text-white rounded-lg hover:bg-forest-800 transition-colors shadow-sm"
            >
              Compare Observations
            </Link>
            {plan.status !== 'Completed' && (
              <button
                type="button"
                onClick={handleMarkPlanComplete}
                disabled={updating}
                className="w-full text-center text-xs font-medium py-2.5 border border-forest-200 text-forest-700 bg-forest-50/50 rounded-lg hover:bg-forest-100 transition-colors cursor-pointer"
              >
                Mark Plan Complete
              </button>
            )}
            <Link
              to={`/app/tree/${actualTreeId}`}
              className="block w-full text-center text-xs font-medium py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Tree Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
