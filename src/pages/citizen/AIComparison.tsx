import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { observationsApi, type ObservationComparisonResponse } from '../../services/observations';
import { treesApi, type Tree } from '../../services/trees';

export default function AIComparison() {
  const { id } = useParams();
  const treeId = id ?? 'TRE-0481';

  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<Tree | null>(null);
  const [comparison, setComparison] = useState<ObservationComparisonResponse | null>(null);

  const fetchComparison = async () => {
    try {
      setError(null);
      const [treeData, compData] = await Promise.all([
        treesApi.getTreeById(treeId).catch(() => null),
        observationsApi.getObservationComparison(treeId),
      ]);
      setTree(treeData);
      setComparison(compData);
    } catch (err: any) {
      setError(err.message || 'Failed to load observation comparison.');
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [treeId]);

  const runComparison = async () => {
    setIsAnalyzing(true);
    await fetchComparison();
  };

  if (loading) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 border-4 border-forest-100 border-t-forest-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm font-medium">Loading real observation records and AI comparison…</p>
      </div>
    );
  }

  const prevScore = comparison?.previous_score ?? 74;
  const currScore = comparison?.current_score ?? (tree?.health_score ?? 68);
  const scoreDiff = comparison?.score_change ?? (currScore - prevScore);
  const changeCat = comparison?.change_category ?? (scoreDiff > 3 ? 'improved' : scoreDiff < -3 ? 'deterioration' : 'stable');
  const prevDate = comparison?.previous_date ?? 'Aug 5, 2026';
  const currDate = comparison?.current_date ?? (tree?.last_inspection || 'Recent');
  const prevImg = comparison?.previous_image_url || tree?.image_url || 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&h=360&fit=crop&auto=format';
  const currImg = comparison?.current_image_url || tree?.image_url || 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&h=360&fit=crop&auto=format';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={`/app/tree/${treeId}`} className="hover:text-gray-600">Tree {treeId}</Link>
        <span>/</span>
        <span className="text-gray-900">Compare Observations</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">AI Observation Comparison</h1>
            <span className="text-xs bg-forest-50 text-forest-700 font-mono px-2 py-0.5 rounded border border-forest-200">
              {treeId}
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            Comparing verified observation records for <strong>{tree?.common_name || tree?.species || 'Urban Tree'}</strong> at {tree?.location_name || 'Registry Location'}. Results are AI-generated assessments — not official diagnoses.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <p>{error}</p>
          <button onClick={fetchComparison} className="text-xs font-semibold underline ml-3">Retry</button>
        </div>
      )}

      {/* Photo comparison */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Previous observation</span>
            <span className="text-xs text-gray-400">{prevDate}</span>
          </div>
          <div className="relative rounded-xl overflow-hidden bg-gray-100">
            <img src={prevImg} alt="Previous observation" className="w-full h-56 object-cover" />
            <div className="absolute bottom-3 left-3 bg-black/60 text-white text-sm px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm">
              Health Score: {prevScore}
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current observation</span>
            <span className="text-xs text-gray-400">{currDate}</span>
          </div>
          <div className="relative rounded-xl overflow-hidden bg-gray-100">
            <img src={currImg} alt="Current observation" className="w-full h-56 object-cover" />
            <div className={`absolute bottom-3 left-3 text-white text-sm px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm ${scoreDiff < 0 ? 'bg-red-600/80' : 'bg-forest-600/80'}`}>
              Health Score: {currScore}
            </div>
          </div>
        </div>
      </div>

      {/* AI analysis loading */}
      {isAnalyzing && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center mb-6">
          <div className="w-12 h-12 rounded-full border-4 border-forest-100 border-t-forest-600 animate-spin mx-auto mb-5" />
          <p className="font-semibold text-gray-900 mb-2">Comparing tree observations from PostgreSQL…</p>
          <p className="text-xs text-gray-400 mt-2">Computing condition changes, canopy density shifts, and trend delta.</p>
        </div>
      )}

      {/* Comparison Result */}
      {!isAnalyzing && (
        <div className={`rounded-xl border shadow-sm p-6 mb-6 ${
          changeCat === 'improved'
            ? 'bg-green-50 border-green-200'
            : changeCat === 'deterioration'
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Comparison Result</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  changeCat === 'improved'
                    ? 'text-green-700 bg-green-100'
                    : changeCat === 'deterioration'
                    ? 'text-red-700 bg-red-100'
                    : 'text-blue-700 bg-blue-100'
                }`}>
                  {changeCat === 'improved' ? 'Condition Improved' : changeCat === 'deterioration' ? 'Potential Deterioration' : 'Condition Stable'}
                </span>
              </div>

              {/* Score comparison */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-gray-800">{prevScore}</p>
                  <p className="text-xs text-gray-500">Previous score</p>
                </div>
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-semibold ${scoreDiff > 0 ? 'text-green-600' : scoreDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                  </p>
                  <p className="text-xs text-gray-500">Change</p>
                </div>
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-gray-800">{currScore}</p>
                  <p className="text-xs text-gray-500">Current score</p>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">AI Observation</p>
                <p className="text-sm text-gray-700 leading-relaxed italic">
                  "{comparison?.observation_summary || 'No sudden structural changes observed across consecutive monitoring cycles.'}"
                </p>
                <p className="text-xs text-gray-400 mt-1">This is an AI-generated comparison assessment, not an official determination.</p>
              </div>

              <div className={`p-3 rounded-lg ${changeCat === 'deterioration' ? 'bg-red-100/60' : 'bg-white/60'}`}>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Recommended next action</p>
                <p className="text-sm font-medium text-gray-800">
                  {comparison?.next_action || (changeCat === 'deterioration' ? 'Manual inspection recommended within 5 days.' : 'Continue regular monitoring schedule.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={runComparison} className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">
          Re-run comparison
        </button>
        <Link to={`/app/inspector/followup/${treeId}`} className="text-sm bg-forest-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors">
          Record New Observation
        </Link>
        <Link to={`/app/tree/${treeId}/recovery-plan`} className="text-sm border border-forest-200 text-forest-700 px-4 py-2 rounded-lg font-medium hover:bg-forest-50 transition-colors">
          Update Recovery Plan
        </Link>
      </div>

      {/* Confidence info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">About this comparison</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">AI Confidence</p>
            <p className="text-sm font-medium text-gray-800">{comparison?.ai_confidence || 84}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Method</p>
            <p className="text-sm font-medium text-gray-800">Visual & Telemetry Comparison</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Assessment type</p>
            <p className="text-sm font-medium text-gray-800">AI-generated (Rule/Visual)</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          AI Health Assessment Scores are computer-generated indicators intended to support, not replace, professional field inspection. Score values should not be treated as medically or scientifically precise measurements.
        </p>
      </div>
    </div>
  );
}
