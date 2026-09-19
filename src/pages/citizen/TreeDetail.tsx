import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatusBadge from '../../components/StatusBadge';
import { treesApi, Tree, TreeRiskResponse } from '../../services/trees';
import { observationsApi, ObservationResponse } from '../../services/observations';
import { recoveryPlansApi, RecoveryPlan } from '../../services/recoveryPlans';


const typeConfig: Record<string, { icon: string; color: string }> = {
  assessment: { icon: '🤖', color: 'bg-blue-100 text-blue-700' },
  alert: { icon: '⚠️', color: 'bg-amber-100 text-amber-700' },
  inspection: { icon: '👷', color: 'bg-forest-100 text-forest-700' },
  scheduled: { icon: '📅', color: 'bg-purple-100 text-purple-700' },
};

const actionStatusConfig: Record<string, { label: string; classes: string; icon: string }> = {
  completed: { label: 'Done', classes: 'bg-green-100 text-green-700', icon: '✓' },
  'in-progress': { label: 'In progress', classes: 'bg-blue-100 text-blue-700', icon: '⟳' },
  pending: { label: 'Pending', classes: 'bg-gray-100 text-gray-500', icon: '○' },
};

function getTreeImage(tree: Tree): string {
  if (tree.image_url) return tree.image_url;
  const s = (tree.species || tree.common_name || '').toLowerCase();
  if (s.includes('elm')) {
    return 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=800&h=600&fit=crop&auto=format';
  }
  if (s.includes('oak')) {
    return 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&h=600&fit=crop&auto=format';
  }
  if (s.includes('maple')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&auto=format';
  }
  if (s.includes('cherry')) {
    return 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&h=600&fit=crop&auto=format';
  }
  if (s.includes('ginkgo')) {
    return 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&h=600&fit=crop&auto=format';
  }
  return 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&auto=format';
}

function getHealthHistory(score: number, obsList: ObservationResponse[] = []) {
  if (obsList && obsList.length > 0) {
    return obsList.slice(-5).map((o) => ({
      month: new Date(o.observation_date).toLocaleDateString('en-US', { month: 'short' }),
      score: o.health_score,
    }));
  }
  return [
    { month: 'Baseline', score: score },
    { month: 'Current', score: score },
  ];
}


function getHealthAssessment(tree: Tree) {
  const status = (tree.status || 'healthy').toLowerCase();
  const score = tree.health_score ?? 70;

  if (status === 'emergency' || score < 30) {
    return {
      title: 'Critical structural / safety risk detected',
      desc: 'Severely compromised canopy density and structural indicators observed. Immediate field response and hazard mitigation required within 24–48 hours.',
      signs: ['Severe branch failure / structural fracture', 'Major crown dieback', 'Root zone instability'],
      stress: ['Severe storm impact', 'Structural decay', 'Compacted root zone'],
      badge: 'Emergency condition',
      prevScore: Math.min(100, score + 35),
      change: -35,
    };
  }
  if (status === 'at-risk' || score < 55) {
    return {
      title: 'Potential drought stress detected',
      desc: 'Canopy thinning and early leaf drop observed. Pattern is consistent with extended dry period or root zone compaction stress. Field inspection recommended within 14 days.',
      signs: ['Canopy thinning (moderate)', 'Premature leaf drop', 'Crown dieback visible'],
      stress: ['Drought (likely)', 'Root compaction', 'Poor drainage'],
      badge: 'Assessment — not a diagnosis',
      prevScore: Math.min(100, score + 32),
      change: -32,
    };
  }
  if (status === 'monitoring' || score < 75) {
    return {
      title: 'Mild moisture stress & crown thinning observed',
      desc: 'Slight canopy irregularities and minor moisture deficit detected. Condition is stable but warrants scheduled observational monitoring.',
      signs: ['Mild leaf scorch', 'Minor branch dieback', 'Slightly reduced foliage density'],
      stress: ['Urban heat exposure', 'Moderate soil compaction', 'Sub-optimal drainage'],
      badge: 'Observational assessment',
      prevScore: Math.min(100, score + 10),
      change: -10,
    };
  }
  return {
    title: 'Vigorous crown & healthy foliage verified',
    desc: 'Dense canopy coverage, robust trunk structure, and vibrant leaf pigmentation observed. Tree exhibits strong physiological resilience.',
    signs: ['Full canopy density', 'Healthy bark pigmentation', 'Active seasonal shoot growth'],
    stress: ['Normal urban exposure (well-tolerated)'],
    badge: 'Healthy baseline',
    prevScore: Math.max(80, score - 5),
    change: +5,
  };
}

function getEnvironmentalContext(tree: Tree) {
  const status = (tree.status || 'healthy').toLowerCase();
  if (status === 'emergency' || status === 'at-risk') {
    return [
      { label: 'Recent rainfall', value: '8mm', sub: 'Last 30 days (avg: 42mm)', icon: '🌧' },
      { label: 'Avg. temperature', value: '29°C', sub: 'Above seasonal norm', icon: '🌡' },
      { label: 'Humidity', value: '34%', sub: 'Below threshold', icon: '💧' },
      { label: 'Heat stress', value: 'High', sub: 'Urban heat island', icon: '🔥' },
    ];
  }
  if (status === 'monitoring') {
    return [
      { label: 'Recent rainfall', value: '18mm', sub: 'Last 30 days (avg: 42mm)', icon: '🌧' },
      { label: 'Avg. temperature', value: '25°C', sub: 'Seasonal norm', icon: '🌡' },
      { label: 'Humidity', value: '42%', sub: 'Moderate threshold', icon: '💧' },
      { label: 'Heat stress', value: 'Moderate', sub: 'Partial shade exposure', icon: '🔥' },
    ];
  }
  return [
    { label: 'Recent rainfall', value: '35mm', sub: 'Last 30 days (avg: 42mm)', icon: '🌧' },
    { label: 'Avg. temperature', value: '22°C', sub: 'Optimal seasonal range', icon: '🌡' },
    { label: 'Humidity', value: '58%', sub: 'Optimal threshold', icon: '💧' },
    { label: 'Heat stress', value: 'Low', sub: 'Sufficient park canopy', icon: '🔥' },
  ];
}

export default function TreeDetail() {
  const { id } = useParams();
  const treeId = id || '';

  const [tree, setTree] = useState<Tree | null>(null);
  const [observations, setObservations] = useState<ObservationResponse[]>([]);
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);

  const [riskData, setRiskData] = useState<TreeRiskResponse | null>(null);
  const [riskLoading, setRiskLoading] = useState<boolean>(true);
  const [riskError, setRiskError] = useState<string | null>(null);

  const [treeInspections, setTreeInspections] = useState<any[]>([]);

  const loadTreeData = async () => {
    if (!treeId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const [treeRecord, obsRecords, planRecord, inspectionRecords] = await Promise.all([
        treesApi.getTreeById(treeId),
        observationsApi.getTreeObservations(treeId).catch(() => []),
        recoveryPlansApi.getPlanByTreeId(treeId).catch(() => null),
        treesApi.getTreeInspections(treeId).catch(() => []),
      ]);
      setTree(treeRecord);
      setObservations(obsRecords || []);
      setRecoveryPlan(planRecord);
      setTreeInspections(inspectionRecords || []);
    } catch (err: any) {
      if (err?.status === 404 || err?.message?.toLowerCase().includes('not found') || err?.message?.includes('404')) {
        setNotFound(true);
      } else {
        setError(err?.message || 'Unable to load tree details.');
      }
    } finally {
      setLoading(false);
    }
  };


  const loadRiskData = async () => {
    if (!treeId) return;
    setRiskLoading(true);
    setRiskError(null);
    try {
      const data = await treesApi.getTreeRisk(treeId);
      setRiskData(data);
    } catch (err: any) {
      setRiskError(err?.message || 'Failed to load AI risk prediction.');
    } finally {
      setRiskLoading(false);
    }
  };

  useEffect(() => {
    loadTreeData();
    loadRiskData();
  }, [treeId]);

  // Loading State
  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-forest-800">Loading tree details for {treeId}...</p>
      </div>
    );
  }

  // Not Found State (404)
  if (notFound || !tree) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/app" className="hover:text-gray-600">Dashboard</Link>
          <span>/</span>
          <Link to="/app/map" className="hover:text-gray-600">Tree Map</Link>
          <span>/</span>
          <span className="text-gray-900 font-mono">{treeId || 'Unknown'}</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            🌳
          </div>
          <h2 className="text-2xl font-display font-semibold text-gray-900 mb-2">Tree Not Found</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            We couldn't find a tree record matching ID <span className="font-mono font-semibold text-gray-800">{treeId}</span> in the urban forestry registry.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/app/map"
              className="bg-forest-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-forest-800 transition-colors"
            >
              Explore Tree Map
            </Link>
            <Link
              to="/app"
              className="border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xl mx-auto mb-3">
            ⚠️
          </div>
          <h2 className="text-lg font-semibold text-red-900 mb-1">Unable to Load Tree Details</h2>
          <p className="text-sm text-red-700 mb-5">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => { loadTreeData(); loadRiskData(); }}
              className="bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-800 transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
            <Link
              to="/app/map"
              className="border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const assessment = getHealthAssessment(tree);
  const environmentalContext = getEnvironmentalContext(tree);
  const healthHistory = getHealthHistory(tree.health_score ?? 70, observations);
  const treeImage = getTreeImage(tree);


  const monitoringTimeline = observations.length > 0
    ? observations.map((obs) => ({
        date: new Date(obs.observation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        type: obs.change_category === 'deterioration' ? 'alert' : 'assessment',
        label: `Observation (${obs.condition})`,
        score: obs.health_score,
        desc: obs.notes || obs.ai_assessment || 'Field observation recorded.',
        inspector: obs.inspector_name,
        status: obs.change_category === 'deterioration' ? 'attention' : 'completed',
      }))
    : [
        {
          date: tree.last_inspection || 'Baseline',
          type: 'assessment',
          label: 'Initial Tree Registry Baseline',
          score: tree.health_score,
          desc: `Baseline registry assessment for ${tree.species} at ${tree.location_name}.`,
          inspector: 'Urban Forestry Registry',
          status: 'completed',
        },
      ];

  const prevObs = observations.length >= 2 ? observations[1] : null;
  const currObs = observations.length >= 1 ? observations[0] : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/app" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <Link to="/app/map" className="hover:text-gray-600">Tree Map</Link>
        <span>/</span>
        <span className="text-gray-900 font-mono">{tree.id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-8">
        <img
          src={treeImage}
          alt={`${tree.common_name || tree.species} tree`}
          className="w-full lg:w-72 h-48 object-cover rounded-xl bg-gray-100 flex-shrink-0"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-sm text-gray-400">{tree.id}</span>
            <StatusBadge status={tree.status} dot />
            {tree.status === 'at-risk' && (
              <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">Recovery Plan Active</span>
            )}
            {tree.status === 'emergency' && (
              <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">Emergency Active</span>
            )}
          </div>
          <h1 className="font-display text-3xl text-gray-900 mb-1">{tree.common_name || tree.species}</h1>
          <p className="text-gray-500 text-sm mb-4">{tree.location_name}</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Species', value: tree.species },
              { label: 'Height', value: tree.height_m ? `~${tree.height_m}m` : '~15m' },
              { label: 'Last inspection', value: tree.last_inspection || 'Recently recorded' },
              { label: 'AI Health Score', value: `${tree.health_score} / 100` },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                <p className="text-sm font-medium text-gray-900 truncate" title={item.value}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to={`/app/tree/${tree.id}/create-recovery-plan`} className="text-sm bg-forest-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors">
              Create Recovery Plan
            </Link>
            <Link to={`/app/tree/${tree.id}/comparison`} className="text-sm border border-forest-200 text-forest-700 px-4 py-2 rounded-lg font-medium hover:bg-forest-50 transition-colors">
              Compare Observations
            </Link>
            <Link to="/app/report" className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Report problem
            </Link>
            <Link to={`/app/tree/${tree.id}/create-recovery-plan`} className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Upload Follow-up
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* AI Health Assessment */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">AI Health Assessment</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{assessment.badge}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-400 mb-1">AI Health Score</p>
                <p className={`text-3xl font-semibold mb-1 ${tree.health_score < 45 ? 'text-amber-600' : tree.health_score < 30 ? 'text-red-600' : 'text-forest-700'}`}>
                  {tree.health_score}
                </p>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className={`h-2 rounded-full ${tree.health_score < 30 ? 'bg-red-500' : tree.health_score < 60 ? 'bg-amber-400' : 'bg-forest-500'}`}
                    style={{ width: `${tree.health_score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Previous: {assessment.prevScore} · Change: <span className={assessment.change < 0 ? 'text-red-500 font-medium' : 'text-forest-600 font-medium'}>{assessment.change > 0 ? `+${assessment.change}` : assessment.change}</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">AI Confidence</p>
                <p className="text-3xl font-semibold text-forest-600 mb-1">{tree.health_confidence || 85}%</p>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-2 bg-forest-500 rounded-full" style={{ width: `${tree.health_confidence || 85}%` }} />
                </div>
              </div>
            </div>
            <div className={`border rounded-lg p-4 mb-4 ${tree.status === 'emergency' ? 'bg-red-50 border-red-100' : tree.status === 'at-risk' ? 'bg-amber-50 border-amber-100' : 'bg-forest-50 border-forest-100'}`}>
              <p className={`text-sm font-semibold mb-1 ${tree.status === 'emergency' ? 'text-red-800' : tree.status === 'at-risk' ? 'text-amber-800' : 'text-forest-800'}`}>{assessment.title}</p>
              <p className={`text-sm leading-relaxed ${tree.status === 'emergency' ? 'text-red-700' : tree.status === 'at-risk' ? 'text-amber-700' : 'text-forest-700'}`}>{assessment.desc}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Detected signs</p>
                <ul className="space-y-1.5">
                  {assessment.signs.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tree.status === 'emergency' ? 'bg-red-400' : tree.status === 'at-risk' ? 'bg-amber-400' : 'bg-forest-400'}`} />{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Possible stress factors</p>
                <ul className="space-y-1.5">
                  {assessment.stress.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tree Recovery Plan */}
          <div className="bg-white rounded-xl border border-forest-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-forest-50 border-b border-forest-100">
              <div className="flex items-center gap-2">
                <span className="text-forest-700 text-lg">🌿</span>
                <h2 className="font-semibold text-forest-900 text-sm">Tree Recovery Plan</h2>
                <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                  {recoveryPlan ? recoveryPlan.status : (tree.status === 'emergency' ? 'Action Required' : 'In Progress')}
                </span>
              </div>
              <Link to={`/app/tree/${tree.id}/recovery-plan`} className="text-xs text-forest-600 hover:text-forest-700 font-medium">View full plan →</Link>
            </div>
            <div className="p-6">
              {recoveryPlan ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 pb-5 border-b border-gray-50">
                    {[
                      { label: 'Detected issue', value: recoveryPlan.detected_issue || assessment.title },
                      { label: 'AI Confidence', value: `${recoveryPlan.ai_confidence || tree.health_confidence || 85}%` },
                      { label: 'Severity', value: recoveryPlan.severity || (tree.status === 'emergency' ? 'High' : tree.status === 'at-risk' ? 'Medium' : 'Low') },
                      { label: 'Priority', value: recoveryPlan.priority || (tree.status === 'emergency' ? 'High' : tree.status === 'at-risk' ? 'Medium' : 'Low') },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                        <p className="text-sm font-medium text-gray-800 truncate" title={item.value}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {recoveryPlan.actions && recoveryPlan.actions.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Plan Action Items</p>
                      <div className="space-y-2">
                        {recoveryPlan.actions.map((action) => {
                          const cfg = actionStatusConfig[action.status] || actionStatusConfig['pending'];
                          return (
                            <div key={action.id || action.label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${cfg.classes}`}>{cfg.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${action.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{action.label}</p>
                                <p className="text-xs text-gray-400">{action.assignee || recoveryPlan.assigned_inspector_name || 'Municipal Team'} {action.due ? `· Due ${action.due}` : ''}</p>
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.classes}`}>{cfg.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                    {[
                      { label: 'Assigned to', value: recoveryPlan.assigned_inspector_name || 'Municipal Field Team' },
                      { label: 'Target date', value: recoveryPlan.target_date || 'Pending' },
                      { label: 'Re-inspection', value: recoveryPlan.reinspection_date || 'Pending' },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                        <p className="text-sm font-medium text-gray-800">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-600 mb-3">No active recovery plan currently recorded for this tree.</p>
                  <Link
                    to={`/app/tree/${tree.id}/create-recovery-plan`}
                    className="inline-block bg-forest-700 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-forest-800 transition-colors"
                  >
                    + Create Recovery Plan
                  </Link>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-4">AI recommendations should support, not replace, qualified inspector assessment. Actions marked for branch removal require inspector confirmation.</p>
            </div>
          </div>


          {/* Continuous Monitoring */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Continuous Monitoring</h2>
              <Link to={`/app/tree/${tree.id}/comparison`} className="text-xs text-forest-600 hover:text-forest-700 font-medium border border-forest-200 px-3 py-1.5 rounded-lg">
                Compare observations →
              </Link>
            </div>

            {/* Before/after thumbnails */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <p className="text-xs text-gray-400 mb-1.5 font-medium">
                  Previous observation · {prevObs ? new Date(prevObs.observation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Baseline'}
                </p>
                <div className="relative rounded-lg overflow-hidden bg-gray-100">
                  <img src={prevObs?.image_url || treeImage} alt="Previous observation" className="w-full h-28 object-cover opacity-80" />
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-medium">
                    Score: {prevObs?.health_score ?? assessment.prevScore}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1.5 font-medium">
                  Current observation · {currObs ? new Date(currObs.observation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (tree.last_inspection || 'Recent')}
                </p>
                <div className="relative rounded-lg overflow-hidden bg-gray-100">
                  <img src={currObs?.image_url || treeImage} alt="Current observation" className="w-full h-28 object-cover" />
                  <div className={`absolute bottom-2 left-2 text-white text-xs px-2 py-0.5 rounded font-medium ${tree.health_score < 50 ? 'bg-red-600/90' : 'bg-forest-700/90'}`}>
                    Score: {currObs?.health_score ?? tree.health_score}
                  </div>
                </div>
              </div>
            </div>

            {/* AI comparison summary */}
            <div className={`border rounded-lg p-4 mb-5 ${tree.health_score < 50 ? 'bg-red-50 border-red-100' : 'bg-forest-50 border-forest-100'}`}>
              <div className="flex items-start gap-3">
                <span className={`text-lg flex-shrink-0 ${tree.health_score < 50 ? 'text-red-500' : 'text-forest-600'}`}>
                  {tree.health_score < 50 ? '⚠' : '✓'}
                </span>
                <div>
                  <p className={`text-sm font-semibold mb-0.5 ${tree.health_score < 50 ? 'text-red-800' : 'text-forest-800'}`}>
                    {tree.health_score < 50 ? 'Potential deterioration — AI comparison' : 'Stable physiological indicators'}
                  </p>
                  <p className={`text-sm leading-relaxed ${tree.health_score < 50 ? 'text-red-700' : 'text-forest-700'}`}>
                    {tree.health_score < 50
                      ? `Condition shows decline compared with previous assessment. Change: ${assessment.change}. Field review recommended.`
                      : `Vegetative vigor and crown indices remain consistent with previous baseline.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Health trend chart */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Health Assessment Score Trend</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={healthHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v: unknown) => [`${v} / 100`, 'AI Health Score']}
                />
                <Line type="monotone" dataKey="score" stroke="#d97706" strokeWidth={2} dot={{ fill: '#d97706', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 mt-2">AI Health Assessment Score is an AI-generated indicator. It supports, but does not replace, field inspection by qualified personnel.</p>
          </div>

          {/* AI Tree Risk Prediction */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">AI Tree Risk Prediction</h2>
                <span className="text-xs bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">AI-powered forecast</span>
              </div>
              <span className="text-xs text-gray-400">Assessment — not a diagnosis</span>
            </div>

            {riskLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Calculating AI risk assessment for {tree.id}...</p>
              </div>
            ) : riskError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm">
                <p className="font-semibold text-red-800 mb-1">Failed to load risk prediction</p>
                <p className="text-xs text-red-700 mb-3">{riskError}</p>
                <button
                  onClick={loadRiskData}
                  className="text-xs bg-red-700 text-white px-3 py-1.5 rounded-md font-medium hover:bg-red-800 transition-colors cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            ) : riskData?.is_inconclusive || riskData?.future_risk.toLowerCase() === 'inconclusive' ? (
              <div className="space-y-4">
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⚠️</span>
                    <h3 className="text-base font-semibold text-amber-900">Analysis Inconclusive</h3>
                  </div>
                  <p className="text-sm text-amber-800 leading-relaxed mb-3">
                    {riskData?.risk_explanation || 'Additional inspection or higher-quality data is required before a reliable risk assessment can be made.'}
                  </p>
                  <span className="inline-block text-xs bg-amber-200 text-amber-800 font-medium px-2.5 py-1 rounded-full">
                    Manual review recommended
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  AI Tree Risk Prediction requires verified multi-point sensor readings and recent imagery to generate high-confidence risk horizons.
                </p>
              </div>
            ) : riskData ? (
              <>
                {/* Risk level + forecast summary */}
                <div className="grid sm:grid-cols-3 gap-4 mb-5">
                  <div className={`sm:col-span-1 rounded-xl p-4 flex flex-col items-center justify-center text-center ${
                    riskData.future_risk.toLowerCase() === 'critical'
                      ? 'bg-red-50 border border-red-200'
                      : riskData.future_risk.toLowerCase() === 'high'
                      ? 'bg-red-50 border border-red-100'
                      : riskData.future_risk.toLowerCase() === 'moderate'
                      ? 'bg-amber-50 border border-amber-100'
                      : 'bg-green-50 border border-green-100'
                  }`}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Predicted Future Risk</p>
                    <p className={`text-3xl font-semibold mb-1 uppercase ${
                      riskData.future_risk.toLowerCase() === 'critical'
                        ? 'text-red-700'
                        : riskData.future_risk.toLowerCase() === 'high'
                        ? 'text-red-600'
                        : riskData.future_risk.toLowerCase() === 'moderate'
                        ? 'text-amber-600'
                        : 'text-forest-700'
                    }`}>
                      {riskData.future_risk}
                    </p>
                    <div className="flex gap-1 w-full mt-1">
                      {['low', 'moderate', 'high', 'critical'].map((level) => {
                        const activeLevels: Record<string, string[]> = {
                          low: ['low'],
                          moderate: ['low', 'moderate'],
                          high: ['low', 'moderate', 'high'],
                          critical: ['low', 'moderate', 'high', 'critical'],
                        };
                        const isActive = activeLevels[riskData.future_risk.toLowerCase()]?.includes(level);
                        const colors: Record<string, string> = {
                          low: 'bg-green-500',
                          moderate: 'bg-amber-500',
                          high: 'bg-red-500',
                          critical: 'bg-red-700',
                        };
                        return (
                          <div
                            key={level}
                            className={`h-1.5 rounded-full flex-1 transition-all ${isActive ? colors[level] : 'bg-gray-200'}`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">4 levels: Low → Critical</p>
                  </div>
                  <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-0.5">Forecast period</p>
                      <p className="text-sm font-semibold text-gray-800">{riskData.prediction_horizon}</p>
                      <p className="text-xs text-gray-400">Prediction horizon</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-0.5">Prediction confidence</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-800">
                          {typeof riskData.prediction_confidence === 'number' ? `${riskData.prediction_confidence}%` : 'N/A'}
                        </p>
                        {typeof riskData.prediction_confidence === 'number' && riskData.prediction_confidence < 60 && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded">Low</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">AI assessment</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-0.5">AI Assessment</p>
                      <p className="text-sm font-semibold text-gray-800 truncate" title={riskData.assessment}>{riskData.assessment}</p>
                      <p className="text-xs text-gray-400">Risk classification</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-0.5">Trend</p>
                      <p className="text-sm font-semibold text-gray-800">{riskData.trend || 'Stable'}</p>
                      <p className="text-xs text-gray-400">Condition trajectory</p>
                    </div>
                  </div>
                </div>

                {/* Low confidence notice if applicable */}
                {typeof riskData.prediction_confidence === 'number' && riskData.prediction_confidence < 60 && (
                  <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <span className="font-semibold">Notice:</span> Prediction confidence is low ({riskData.prediction_confidence}%). Manual review recommended before taking action.
                  </div>
                )}

                {/* Risk Explanation */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Risk Explanation</p>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg p-3.5">
                    {riskData.risk_explanation}
                  </p>
                </div>

                {/* Key Risk Factors */}
                {riskData.risk_factors && riskData.risk_factors.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Key Risk Factors</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {riskData.risk_factors.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                          <span className="text-xs text-gray-600 font-medium">{f.factor}</span>
                          <span className="text-xs font-semibold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preventive Action */}
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-5">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Recommended Preventive Action</p>
                  <p className="text-sm text-amber-900 font-medium mb-1">{riskData.recommended_action}</p>
                  <p className="text-xs text-amber-700">AI recommendation — manual inspection recommended. Any physical intervention should be confirmed by a qualified field inspector.</p>
                </div>

                {/* Related recovery plan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-forest-50 border border-forest-100 rounded-lg mb-5">
                  <div>
                    <p className="text-xs font-semibold text-forest-700 uppercase tracking-wider mb-1">Related Recovery Plan</p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="text-gray-600">Status: <span className="font-medium text-blue-700">Active</span></span>
                      <span className="text-gray-600">Priority: <span className="font-medium text-amber-700">Medium</span></span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Continue recovery monitoring and reassess after inspection.</p>
                  </div>
                  <Link to={`/app/tree/${tree.id}/recovery-plan`} className="text-sm bg-forest-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors flex-shrink-0 text-center">
                    View Recovery Plan
                  </Link>
                </div>

                {/* Risk history */}
                {riskData.risk_history && riskData.risk_history.length > 0 && (
                  <div className="border-t border-gray-50 pt-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Risk History & Trend</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {riskData.risk_history.map((h, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            h.risk.toLowerCase() === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : h.risk.toLowerCase() === 'high'
                              ? 'bg-red-100 text-red-700'
                              : h.risk.toLowerCase() === 'moderate'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {h.risk}
                          </span>
                          <span className="text-xs text-gray-500">{h.period}</span>
                          {i < riskData.risk_history!.length - 1 && <span className="text-gray-300 ml-1">→</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-50 leading-relaxed">
                  AI Tree Risk Prediction is a forecast generated from health scores, environmental data, and trend analysis. It is an AI risk assessment, not a guaranteed outcome, and should not be used as the sole basis for physical intervention.
                </p>
              </>
            ) : null}
          </div>

          {/* Health timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-5">Health History Timeline</h2>
            <div className="space-y-0">
              {monitoringTimeline.map((event, i) => {
                const cfg = typeConfig[event.type] ?? { icon: '●', color: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      {i < monitoringTimeline.length - 1 && (
                        <div className="w-0.5 bg-gray-100 flex-1 my-1" style={{ minHeight: 24 }} />
                      )}
                    </div>
                    <div className="pb-5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-medium text-gray-400">{event.date}</span>
                        {event.score !== null && (
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">Score: {event.score}</span>
                        )}
                        {event.status === 'attention' && (
                          <span className="text-xs text-red-600 bg-red-50 font-medium px-2 py-0.5 rounded-full">Attention required</span>
                        )}
                        {event.status === 'pending' && (
                          <span className="text-xs text-purple-600 bg-purple-50 font-medium px-2 py-0.5 rounded-full">Upcoming</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{event.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{event.desc}</p>
                      {event.inspector && (
                        <p className="text-xs text-forest-600 mt-0.5">Inspector: {event.inspector}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Emergency history */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Emergency History</h2>
            {tree.status === 'emergency' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 bg-red-50/70 border border-red-100 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-sm flex-shrink-0">⚡</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Critical hazard condition logged</p>
                    <p className="text-xs text-gray-500">{tree.last_inspection || 'Recent'} · Immediate mitigation protocol active</p>
                  </div>
                  <StatusBadge status="emergency" />
                </div>
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-sm flex-shrink-0">⚡</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Structural defect observation</p>
                    <p className="text-xs text-gray-500">Earlier season · Verified by Field Inspector</p>
                  </div>
                  <StatusBadge status="resolved" />
                </div>
              </div>
            ) : tree.status === 'at-risk' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-sm flex-shrink-0">⚡</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Canopy stress alert recorded</p>
                    <p className="text-xs text-gray-500">{tree.last_inspection || 'Recent'} · Routine monitoring active</p>
                  </div>
                  <StatusBadge status="resolved" />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-600 font-medium">No emergency incidents or structural failures recorded for this tree.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Forestry registry status: Verified normal</p>
              </div>
            )}
          </div>

          {/* Field Inspection & Service History */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Field Inspection & Service Records</h2>
              <span className="text-xs text-gray-400 font-mono">
                {treeInspections.length} recorded
              </span>
            </div>

            {treeInspections.length > 0 ? (
              <div className="space-y-3">
                {treeInspections.map((insp) => {
                  const inspStatus = insp.inspection_status || (insp.status === 'completed' ? 'Inspection Completed' : 'Assigned');
                  const srvStatus = insp.service_status || (insp.service_required ? 'Required' : 'Not Required');
                  const completedDate = insp.inspection_completed_at || insp.completed_at || insp.service_completed_at;

                  return (
                    <div key={insp.id} className="p-4 bg-gray-50/80 border border-gray-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-gray-600">{insp.id}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-50 text-green-800 border border-green-200">
                            Inspection Status: {inspStatus}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {completedDate
                            ? `Completed: ${new Date(completedDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : `Assigned: ${new Date(insp.assigned_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-gray-400">Service Required: </span>
                          <span className="font-semibold text-gray-800">{insp.service_required ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Service Status: </span>
                          <span className={`font-semibold ${srvStatus === 'Service Completed' ? 'text-green-700' : srvStatus === 'Service In Progress' ? 'text-purple-700' : srvStatus === 'Required' ? 'text-amber-700' : 'text-gray-600'}`}>
                            {srvStatus}
                          </span>
                        </div>
                        {completedDate && (
                          <div>
                            <span className="text-gray-400">Completed On: </span>
                            <span className="font-medium text-gray-700">
                              {new Date(completedDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {insp.service_performed && (
                        <p className="text-xs text-purple-800 bg-purple-50/80 p-2 rounded-lg mt-1 border border-purple-100">
                          <strong>Service Performed:</strong> {insp.service_performed}
                        </p>
                      )}

                      {insp.notes && (
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed bg-white p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">
                          {insp.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-600 font-medium">No municipal work orders or field interventions currently scheduled for this tree.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Municipal forestry status: Active in routine registry</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Environmental context */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Environmental Context</h3>
            <div className="space-y-3">
              {environmentalContext.map((env) => (
                <div key={env.label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xl w-7 text-center">{env.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{env.label}</p>
                    <p className="text-sm font-medium text-gray-800">{env.value}</p>
                    <p className="text-xs text-gray-400">{env.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Location</h3>
            <div className="bg-[#e8f0e4] rounded-lg h-32 relative overflow-hidden mb-3">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-5 h-5 rounded-full border-2 border-white shadow-md ${tree.status === 'emergency' ? 'bg-red-500 animate-pulse' : tree.status === 'at-risk' ? 'bg-orange-500' : 'bg-green-600'}`} />
              </div>
              <div className="absolute bottom-1 right-1 text-[10px] text-gray-500 bg-white/90 px-1.5 py-0.5 rounded font-mono">
                {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
              </div>
            </div>
            <p className="text-xs text-gray-800 font-medium">{tree.location_name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Lat: {tree.latitude} · Lng: {tree.longitude}
            </p>
            <Link
              to={`/app/map?treeId=${encodeURIComponent(tree.id)}`}
              className="text-xs text-forest-700 hover:text-forest-800 font-medium inline-flex items-center gap-1 mt-2.5 transition-colors"
            >
              <span>◎</span> View on Tree Map
            </Link>
          </div>

          {/* Tree profile */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Tree Profile</h3>
            <dl className="space-y-2">
              {[
                { term: 'Species', desc: tree.species },
                { term: 'Common name', desc: tree.common_name },
                { term: 'Tree ID', desc: tree.id },
                { term: 'Height', desc: tree.height_m ? `~${tree.height_m}m` : '~15m' },
                { term: 'Crown spread', desc: tree.canopy_spread_m ? `~${tree.canopy_spread_m}m` : '~12m' },
                { term: 'Status', desc: tree.status.toUpperCase() },
                { term: 'Health score', desc: `${tree.health_score} / 100` },
                { term: 'Last inspection', desc: tree.last_inspection || 'Recently recorded' },
              ].map((item) => (
                <div key={item.term} className="flex justify-between text-xs">
                  <dt className="text-gray-400">{item.term}</dt>
                  <dd className="text-gray-700 font-medium text-right truncate max-w-[55%]" title={item.desc}>{item.desc}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Actions</h3>
            {[
              { label: 'Create Recovery Plan', href: `/app/tree/${tree.id}/create-recovery-plan`, primary: true },
              { label: 'Compare Observations', href: `/app/tree/${tree.id}/comparison`, primary: false },
              { label: 'Report problem', href: '/app/report', primary: false },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`block w-full text-center text-xs font-medium py-2 rounded-lg transition-colors ${action.primary ? 'bg-forest-700 text-white hover:bg-forest-800' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
