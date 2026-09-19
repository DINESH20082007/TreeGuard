import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { recoveryPlansApi, RecoveryPlan } from '../../services/recoveryPlans';
import { treesApi, Tree } from '../../services/trees';

type Step = 1 | 2 | 3 | 4 | 5;

const aiRecommendedActions = [
  { id: 'a1', label: 'Inspect soil moisture levels', note: null },
  { id: 'a2', label: 'Check and repair irrigation system', note: null },
  { id: 'a3', label: 'Inspect damaged branches', note: 'Removal should be confirmed by a qualified inspector.' },
  { id: 'a4', label: 'Monitor leaf condition over next 30 days', note: null },
  { id: 'a5', label: 'Reassess health after recommended period', note: null },
];

const stepLabels = ['AI Assessment', 'Edit Actions', 'Assign & Priority', 'Set Dates', 'Review'];

const inspectors = ['Marcus Johnson', 'Elena Rodriguez', 'David Park', 'Aisha Williams'];

const severityConfig: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  Severe: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const priorityConfig: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-600',
  Urgent: 'bg-red-200 text-red-800',
};

export default function CreateRecoveryPlan() {
  const { id } = useParams();
  const treeId = id ?? 'TRE-0481';

  const [tree, setTree] = useState<Tree | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [actions, setActions] = useState(aiRecommendedActions.map((a) => ({ ...a, selected: true })));
  const [customAction, setCustomAction] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [severity, setSeverity] = useState('Moderate');
  const [inspector, setInspector] = useState(inspectors[0]);
  const [targetDate, setTargetDate] = useState('2026-09-25');
  const [reinspectionDate, setReinspectionDate] = useState('2026-10-09');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPlan, setCreatedPlan] = useState<RecoveryPlan | null>(null);

  useEffect(() => {
    treesApi
      .getTreeById(treeId)
      .then((t) => setTree(t))
      .catch(() => {});
  }, [treeId]);

  const toggleAction = (id: string) =>
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)));

  const addCustomAction = () => {
    if (!customAction.trim()) return;
    setActions((prev) => [...prev, { id: `custom-${Date.now()}`, label: customAction.trim(), note: null, selected: true }]);
    setCustomAction('');
  };

  const removeAction = (id: string) => setActions((prev) => prev.filter((a) => a.id !== id));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const selectedActions = actions
      .filter((a) => a.selected)
      .map((a) => ({
        id: a.id,
        label: a.label,
        note: a.note || null,
        status: 'pending' as const,
        assignee: inspector,
        due: targetDate,
      }));

    try {
      const plan = await recoveryPlansApi.createPlan({
        tree_id: treeId,
        priority,
        severity,
        assigned_inspector_name: inspector,
        detected_issue: 'Potential drought stress (AI assessment)',
        ai_assessment: 'Canopy thinning and premature leaf drop consistent with extended dry period or root zone compaction.',
        ai_confidence: 82,
        actions: selectedActions,
        target_date: targetDate,
        reinspection_date: reinspectionDate,
        notes: notes.trim() || undefined,
      });

      setCreatedPlan(plan);
    } catch (err: any) {
      setError(err?.message || 'Failed to create recovery plan. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdPlan) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-8 text-center">
        <div className="w-16 h-16 bg-forest-100 text-forest-700 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm">
          🌿
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Recovery Plan Created</h1>
        <p className="text-gray-500 mb-6">
          The recovery plan for {treeId} has been saved to the database and assigned to {createdPlan.assigned_inspector_name || inspector}.
        </p>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left mb-6">
          <dl className="space-y-3">
            {[
              { term: 'Plan ID', desc: createdPlan.id },
              { term: 'Tree', desc: `${treeId} ${tree ? `— ${tree.species}` : ''}` },
              { term: 'Priority', desc: createdPlan.priority },
              { term: 'Assigned to', desc: createdPlan.assigned_inspector_name },
              { term: 'Target date', desc: createdPlan.target_date || targetDate },
              { term: 'Re-inspection', desc: createdPlan.reinspection_date || reinspectionDate },
              { term: 'Actions', desc: `${createdPlan.actions.length} action items registered` },
            ].map((item) => (
              <div key={item.term} className="flex justify-between text-sm gap-2">
                <dt className="text-gray-400 flex-shrink-0">{item.term}</dt>
                <dd className="text-gray-800 font-medium font-mono text-right truncate">{item.desc}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            to={`/app/tree/${treeId}/recovery-plan`}
            className="bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors shadow-sm"
          >
            View Recovery Plan
          </Link>
          <Link
            to={`/app/tree/${treeId}`}
            className="border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Back to Tree Detail
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={`/app/tree/${treeId}`} className="hover:text-gray-600">
          Tree {treeId}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Create Recovery Plan</span>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {stepLabels.map((label, i) => {
            const s = (i + 1) as Step;
            const done2 = step > s;
            const active = step === s;
            return (
              <div key={label} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    done2 ? 'bg-forest-600 text-white' : active ? 'bg-forest-700 text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done2 ? '✓' : s}
                </div>
                <span className={`text-xs hidden sm:block ${active ? 'text-forest-700 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-1 bg-gray-100 rounded-full">
          <div
            className="h-1 bg-forest-600 rounded-full transition-all duration-300"
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="text-red-600 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-900">Creation Error</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 text-sm">
            ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {/* Step 1: AI Assessment */}
        {step === 1 && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Review AI Assessment</h2>
            <p className="text-gray-500 text-sm mb-5">
              The following is an AI-generated assessment. It is a recommendation, not a diagnosis. You may modify all actions in the next step.
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                  AI Assessment — advisory determination
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { label: 'Detected potential issue', value: 'Drought stress' },
                  { label: 'AI Confidence', value: '82%' },
                  { label: 'Severity', value: severity },
                  { label: 'Tree ID', value: tree ? `${tree.id} (${tree.species})` : treeId },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-amber-600 mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-amber-900">{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">AI-recommended actions</p>
                <ul className="space-y-1.5">
                  {aiRecommendedActions.map((a) => (
                    <li key={a.id} className="text-sm text-amber-800 flex items-start gap-2">
                      <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                      <span>
                        {a.label}
                        {a.note && <span className="text-xs text-amber-600 block">{a.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              You will be able to edit, remove, or add actions in the next step. The AI assessment should support inspector judgment, not replace it.
            </p>
          </>
        )}

        {/* Step 2: Edit actions */}
        {step === 2 && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Select & edit actions</h2>
            <p className="text-gray-500 text-sm mb-5">Review AI-recommended actions. Deselect, edit, or add your own.</p>
            <div className="space-y-2 mb-5">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
                    action.selected ? 'border-forest-200 bg-forest-50' : 'border-gray-100 opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={action.selected}
                    onChange={() => toggleAction(action.id)}
                    className="mt-0.5 w-4 h-4 text-forest-600 rounded cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${action.selected ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                      {action.label}
                    </p>
                    {action.note && <p className="text-xs text-amber-600 mt-0.5">{action.note}</p>}
                  </div>
                  <button
                    onClick={() => removeAction(action.id)}
                    className="text-gray-300 hover:text-red-400 text-xs transition-colors flex-shrink-0 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomAction()}
                placeholder="Add a custom action…"
                className="flex-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addCustomAction}
                className="bg-forest-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-forest-800 transition-colors cursor-pointer"
              >
                + Add
              </button>
            </div>
          </>
        )}

        {/* Step 3: Assign & Priority */}
        {step === 3 && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Assign inspector & set priority</h2>
            <p className="text-gray-500 text-sm mb-5">Choose who will carry out this plan and set its urgency.</p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned inspector</label>
                <select
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                >
                  {inspectors.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(priorityConfig).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${
                        priority === p
                          ? 'border-forest-600 bg-forest-50 text-forest-700'
                          : 'border-gray-100 text-gray-600 hover:border-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(severityConfig).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${
                        severity === s
                          ? 'border-forest-600 bg-forest-50 text-forest-700'
                          : 'border-gray-100 text-gray-600 hover:border-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Additional notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes for the assigned inspector…"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </>
        )}

        {/* Step 4: Set dates */}
        {step === 4 && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Set target & re-inspection dates</h2>
            <p className="text-gray-500 text-sm mb-5">Set realistic timelines for the recovery actions and the follow-up re-inspection.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target completion date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Deadline for completing the recommended actions.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Re-inspection date</label>
                <input
                  type="date"
                  value={reinspectionDate}
                  onChange={(e) => setReinspectionDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  When the inspector returns to assess improvement. A reminder will be sent automatically.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">Automatic reminders</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  The assigned inspector will be notified 3 days before each scheduled date. Overdue re-inspections will escalate to the admin dashboard.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">Review recovery plan</h2>
            <p className="text-gray-500 text-sm mb-5">Confirm the plan details before creating it.</p>
            <div className="space-y-3 mb-5">
              {[
                { label: 'Tree', value: `${treeId} ${tree ? `— ${tree.species}, ${tree.location_name}` : ''}` },
                { label: 'Detected issue', value: 'Potential drought stress (AI assessment)' },
                { label: 'Priority', value: priority },
                { label: 'Severity', value: severity },
                { label: 'Assigned to', value: inspector },
                { label: 'Target date', value: targetDate },
                { label: 'Re-inspection', value: reinspectionDate },
                { label: 'Actions', value: `${actions.filter((a) => a.selected).length} recommended actions` },
              ].map((item) => (
                <div key={item.label} className="flex gap-4 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-400 w-32 flex-shrink-0">{item.label}</span>
                  <span className="text-sm text-gray-800 font-medium">{item.value}</span>
                </div>
              ))}
            </div>
            {notes && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{notes}</p>
              </div>
            )}
            <p className="text-xs text-gray-400">
              AI recommendations are advisory. Final decisions on actions, especially those affecting tree structure, remain the responsibility of qualified inspectors.
            </p>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-50">
          <button
            type="button"
            onClick={() => step > 1 && setStep((step - 1) as Step)}
            disabled={step === 1 || submitting}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-30 transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <span className="text-xs text-gray-400">Step {step} of 5</span>
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as Step)}
              className="text-sm bg-forest-700 text-white px-5 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors cursor-pointer"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="text-sm bg-forest-700 text-white px-5 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating…</span>
                </>
              ) : (
                'Create Recovery Plan'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
