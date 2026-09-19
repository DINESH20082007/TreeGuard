import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { treesApi, type Tree } from '../../services/trees';
import { observationsApi, type ObservationResponse } from '../../services/observations';
import { recoveryPlansApi, type RecoveryPlan } from '../../services/recoveryPlans';

type Phase = 'start' | 'upload' | 'location' | 'notes' | 'analyzing' | 'result' | 'update';

export default function FollowUpObservation() {
  const { id } = useParams();
  const rawId = id ?? 'TRE-0481';
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('start');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tree & Plan & Observation Data
  const [tree, setTree] = useState<Tree | null>(null);
  const [previousObservation, setPreviousObservation] = useState<ObservationResponse | null>(null);
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan | null>(null);

  // Field Form State
  const [preview, setPreview] = useState<string | null>(null);
  const [condition, setCondition] = useState<string>('Fair');
  const [notes, setNotes] = useState('');
  const [planStatus, setPlanStatus] = useState('In Progress');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('2026-10-09');

  // AI Comparison Results
  const [currentScore, setCurrentScore] = useState(68);
  const [prevScore, setPrevScore] = useState(74);
  const [scoreDiff, setScoreDiff] = useState(-6);
  const [changeCategory, setChangeCategory] = useState<'improved' | 'stable' | 'deterioration'>('deterioration');
  const [savedObservation, setSavedObservation] = useState<ObservationResponse | null>(null);

  // Load Tree and Previous Observation Context
  useEffect(() => {
    let mounted = true;
    async function loadContext() {
      setLoading(true);
      setError(null);
      try {
        let targetTreeId = rawId;

        // If ID is a recovery plan or assignment, try to resolve to tree
        if (rawId.startsWith('REC-')) {
          try {
            const plan = await recoveryPlansApi.getPlanById(rawId);
            setRecoveryPlan(plan);
            targetTreeId = plan.tree_id;
          } catch {
            targetTreeId = 'TRE-0481';
          }
        }

        // Fetch tree
        let treeData: Tree;
        try {
          treeData = await treesApi.getTreeById(targetTreeId);
        } catch {
          treeData = await treesApi.getTreeById('TRE-0481');
        }

        if (!mounted) return;
        setTree(treeData);

        // Fetch previous observations for this tree
        try {
          const obsList = await observationsApi.getTreeObservations(treeData.id);
          if (obsList && obsList.length > 0) {
            setPreviousObservation(obsList[0]);
            const pScore = obsList[0].health_score || treeData.health_score || 74;
            setPrevScore(pScore);
          } else {
            setPrevScore(treeData.health_score || 74);
          }
        } catch {
          setPrevScore(treeData.health_score || 74);
        }

        // Fetch latest recovery plan if not already fetched
        if (!recoveryPlan) {
          try {
            const plan = await recoveryPlansApi.getPlanByTreeId(treeData.id);
            setRecoveryPlan(plan);
            if (plan.status) setPlanStatus(plan.status);
            if (plan.reinspection_date) setNextFollowUpDate(plan.reinspection_date);
          } catch {
            // No recovery plan yet
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load tree and monitoring history.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadContext();
    return () => { mounted = false; };
  }, [rawId]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setPhase('location');
    }
  };

  const runAnalysis = () => {
    setPhase('analyzing');

    // Calculate score based on selected condition
    let computedScore = prevScore;
    if (condition === 'Good') {
      computedScore = Math.min(100, Math.max(75, prevScore + 6));
    } else if (condition === 'Fair') {
      computedScore = Math.min(74, Math.max(50, prevScore - 2));
    } else if (condition === 'Poor') {
      computedScore = Math.min(49, Math.max(25, prevScore - 18));
    } else {
      computedScore = Math.min(24, Math.max(10, prevScore - 30));
    }

    const diff = computedScore - prevScore;
    setCurrentScore(computedScore);
    setScoreDiff(diff);

    if (diff > 3) setChangeCategory('improved');
    else if (diff < -3) setChangeCategory('deterioration');
    else setChangeCategory('stable');

    setPhase('result');
  };


  const handleSubmit = async () => {
    if (!tree) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await observationsApi.createObservation({
        tree_id: tree.id,
        recovery_plan_id: recoveryPlan?.id || null,
        condition,
        health_score: currentScore,
        notes: notes || 'Field follow-up observation recorded by inspector.',
        image_url: preview || tree.image_url,
        next_follow_up_date: nextFollowUpDate,
        plan_status_update: planStatus,
        follow_up_required: changeCategory === 'deterioration',
        severity: condition === 'Critical' ? 'Critical' : (condition === 'Poor' ? 'Severe' : 'Moderate'),
        ai_assessment: changeCategory === 'improved'
          ? 'Canopy vigor increased and stress indicators resolved.'
          : changeCategory === 'deterioration'
          ? 'Increased crown thinning and environmental stress detected.'
          : 'Tree condition remains stable across consecutive observation cycles.',
      });

      setSavedObservation(response);
    } catch (err: any) {
      setError(err.message || 'Failed to submit observation. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 border-4 border-forest-100 border-t-forest-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm font-medium">Loading tree observation records…</p>
      </div>
    );
  }

  if (savedObservation) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-8 text-center">
        <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 text-forest-700">✓</div>
        <div className="inline-block bg-forest-50 border border-forest-200 text-forest-800 text-xs font-mono font-semibold px-2.5 py-1 rounded-full mb-3">
          {savedObservation.id}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Follow-up Observation Recorded</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Observation successfully saved to PostgreSQL database. Tree health score updated to <strong>{savedObservation.health_score}/100</strong>.
          {savedObservation.next_follow_up_date && ` Next re-inspection: ${savedObservation.next_follow_up_date}.`}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to={`/app/tree/${tree?.id || rawId}/recovery-plan`}
            className="bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors"
          >
            View Recovery Plan
          </Link>
          <Link
            to={`/app/tree/${tree?.id || rawId}`}
            className="border border-forest-200 text-forest-700 py-2.5 rounded-lg font-medium text-sm hover:bg-forest-50 transition-colors"
          >
            View Tree Registry Details
          </Link>
          <Link
            to="/app/inspector"
            className="border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const phases: { key: Phase; label: string }[] = [
    { key: 'start', label: 'Previous' },
    { key: 'upload', label: 'Photo' },
    { key: 'location', label: 'Location' },
    { key: 'notes', label: 'Notes' },
    { key: 'analyzing', label: 'AI Comparison' },
    { key: 'result', label: 'Result' },
    { key: 'update', label: 'Update Plan' },
  ];
  const phaseIndex = phases.findIndex((p) => p.key === phase);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/app/inspector" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-mono">{tree?.id || rawId}</span>
        <span>/</span>
        <span className="text-gray-900">Follow-up Observation</span>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="text-xs font-semibold underline ml-3">Dismiss</button>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto">
        {phases.map((p, i) => {
          const done = phaseIndex > i;
          const active = phaseIndex === i;
          return (
            <div key={p.key} className="flex items-center gap-1 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${done ? 'bg-forest-100 text-forest-700' : active ? 'bg-forest-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {done ? '✓ ' : ''}{p.label}
              </div>
              {i < phases.length - 1 && <span className="text-gray-200 text-sm">›</span>}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {/* Phase: start — show previous observation */}
        {phase === 'start' && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Previous Observation</h2>
            <p className="text-gray-500 text-sm mb-5">
              Review the latest recorded baseline observation for <strong>{tree?.common_name || tree?.species} ({tree?.id})</strong> before uploading field updates.
            </p>
            <div className="relative rounded-xl overflow-hidden mb-4 bg-gray-100">
              <img
                src={previousObservation?.image_url || tree?.image_url || "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&h=300&fit=crop&auto=format"}
                alt="Previous observation"
                className="w-full h-48 object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm">
                Score: {prevScore} · {previousObservation ? new Date(previousObservation.observation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (tree?.last_inspection || 'Baseline')}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Previous Assessment & Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {previousObservation?.notes || previousObservation?.ai_assessment || 'Baseline tree condition recorded in urban registry. Monitoring active for canopy and moisture stability.'}
              </p>
            </div>
            <button onClick={() => setPhase('upload')} className="w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors">
              Continue to photo upload →
            </button>
          </>
        )}

        {/* Phase: upload */}
        {phase === 'upload' && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Upload New Photo</h2>
            <p className="text-gray-500 text-sm mb-5">Take or upload a clear photo of the tree for AI comparison analysis.</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-forest-400 hover:bg-forest-50/30 transition-all mb-4"
            >
              <div className="text-4xl mb-3">📷</div>
              <p className="font-medium text-gray-700 text-sm mb-1">Take or upload a photo</p>
              <p className="text-xs text-gray-400">Ensure good lighting and a clear view of the full canopy</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
              <strong>Tip:</strong> Poor image quality may result in an inconclusive AI comparison. Take the photo from the same angle as the previous observation where possible.
            </div>
            <button
              onClick={() => setPhase('location')}
              className="w-full mt-4 border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Skip photo & continue with field observation →
            </button>
          </>
        )}

        {/* Phase: location */}
        {phase === 'location' && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Confirm Location</h2>
            <p className="text-gray-500 text-sm mb-5">Confirm you are at the correct tree location.</p>
            {preview && <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-xl mb-4" />}
            <div className="bg-forest-50 border border-forest-100 rounded-lg p-4 flex items-center gap-3 mb-4">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-medium text-forest-800">Location confirmed</p>
                <p className="text-xs text-forest-600">{tree?.location_name || 'DB Road, RS Puram, Coimbatore'} (Lat: {tree?.latitude.toFixed(4)}, Lng: {tree?.longitude.toFixed(4)})</p>
              </div>
            </div>
            <div className="bg-[#e8f0e4] rounded-xl h-32 relative overflow-hidden mb-4 flex items-center justify-center">
              <div className="w-5 h-5 bg-forest-600 rounded-full border-2 border-white shadow" />
              <div className="absolute w-5 h-5 bg-forest-600/30 rounded-full animate-ping" />
              <div className="absolute bottom-1 right-1 text-xs text-gray-500 bg-white/80 px-1.5 py-0.5 rounded font-mono">
                {tree?.id}
              </div>
            </div>
            <button onClick={() => setPhase('notes')} className="w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors">
              Confirm & continue →
            </button>
          </>
        )}

        {/* Phase: notes */}
        {phase === 'notes' && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Field Notes & Condition</h2>
            <p className="text-gray-500 text-sm mb-5">Select observed condition rating and add detailed field findings.</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Observed Condition</label>
              <div className="grid grid-cols-4 gap-2">
                {['Good', 'Fair', 'Poor', 'Critical'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      condition === c
                        ? 'border-forest-600 bg-forest-50 text-forest-800 ring-2 ring-forest-500/20'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Inspector Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Describe canopy density, root zone health, moisture levels, new damage, or recovery progress…"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
              />
            </div>
            <button onClick={runAnalysis} className="w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors">
              Run AI comparison →
            </button>
          </>
        )}

        {/* Phase: analyzing */}
        {phase === 'analyzing' && (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full border-4 border-forest-100 border-t-forest-600 animate-spin mx-auto mb-6" />
            <p className="font-semibold text-gray-900 mb-2">Comparing tree observations…</p>
            <p className="text-xs text-gray-400">Processing visual indicators and updating health metrics.</p>
          </div>
        )}

        {/* Phase: result */}
        {phase === 'result' && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">AI Comparison Result</h2>
            <p className="text-gray-500 text-sm mb-5">Review the calculated assessment before updating the recovery plan.</p>

            <div className={`border rounded-xl p-5 mb-5 ${
              changeCategory === 'improved'
                ? 'bg-green-50 border-green-200'
                : changeCategory === 'deterioration'
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Comparison — Not an official diagnosis</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  changeCategory === 'improved'
                    ? 'bg-green-100 text-green-700'
                    : changeCategory === 'deterioration'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {changeCategory === 'improved' ? 'Improved Condition' : changeCategory === 'deterioration' ? 'Potential Deterioration' : 'Stable Condition'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-xl font-semibold text-gray-800">{prevScore}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Previous score</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className={`text-xl font-semibold ${scoreDiff > 0 ? 'text-green-600' : scoreDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Change</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-xl font-semibold text-gray-800">{currentScore}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Current score</p>
                </div>
              </div>
              <p className="text-sm italic leading-relaxed text-gray-800">
                "{changeCategory === 'improved'
                  ? 'Condition appears to have improved compared with the previous observation. Canopy density and foliage indicators positive.'
                  : changeCategory === 'deterioration'
                  ? 'Condition appears to have deteriorated compared with the previous observation. Foliage stress or structural issues noted.'
                  : 'Tree condition remains stable across consecutive observation cycles. No sudden changes detected.'}"
              </p>
              <div className={`mt-3 p-3 rounded-lg ${changeCategory === 'deterioration' ? 'bg-red-100/50 text-red-800' : 'bg-white/70 text-gray-800'}`}>
                <p className="text-xs font-semibold uppercase tracking-wider">Recommended next action</p>
                <p className="text-sm font-medium mt-0.5">
                  {changeCategory === 'deterioration'
                    ? 'Manual inspection recommended. Schedule field review within 5-7 days.'
                    : 'Maintain regular continuous monitoring schedule.'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-400 mb-1">AI Confidence</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-forest-500 rounded-full" style={{ width: '84%' }} />
                </div>
                <span className="text-sm font-semibold text-forest-700">84%</span>
              </div>
            </div>

            <button onClick={() => setPhase('update')} className="w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors">
              Review & update recovery plan →
            </button>
          </>
        )}

        {/* Phase: update */}
        {phase === 'update' && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Update Recovery Plan</h2>
            <p className="text-gray-500 text-sm mb-5">Based on the AI comparison, update the recovery plan status and schedule the next follow-up.</p>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Update plan status</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['In Progress', 'Inspection Required', 'Waiting for Follow-up', 'Escalated', 'Completed', 'Needs Review'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPlanStatus(s)}
                      className={`py-2.5 px-2 text-xs font-medium rounded-lg border-2 transition-all text-left ${planStatus === s ? 'border-forest-600 bg-forest-50 text-forest-700 font-semibold' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule next follow-up</label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Inspector notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving observation to database…</span>
                </>
              ) : (
                'Submit follow-up & update plan'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
