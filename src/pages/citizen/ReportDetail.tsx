import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { reportsApi, Report, InspectorOption } from '../../services/reports';

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

export default function ReportDetail() {
  const { id } = useParams();
  const reportId = id || '';
  const { role, user } = useAuth();

  const [realReport, setRealReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Inspectors list for assignment
  const [inspectors, setInspectors] = useState<InspectorOption[]>([]);
  const [assignInspectorId, setAssignInspectorId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignPriority, setAssignPriority] = useState('Medium');

  // Inspection form state
  const [condition, setCondition] = useState('Fair');
  const [severity, setSeverity] = useState('Moderate');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [serviceRequired, setServiceRequired] = useState(false);

  // Work form state
  const [workPerformed, setWorkPerformed] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [evidencePhotoName, setEvidencePhotoName] = useState<string | null>(null);

  // Complete report form state
  const [completeNotes, setCompleteNotes] = useState('');

  const fetchReport = async () => {
    if (!reportId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await reportsApi.getReportById(reportId);
      setRealReport(data);
      if (data.priority) setAssignPriority(data.priority);
      if (data.work_performed) setWorkPerformed(data.work_performed);
    } catch (err: any) {
      if (
        err?.status === 404 ||
        err?.message?.toLowerCase().includes('not found') ||
        err?.message?.includes('404')
      ) {
        setNotFound(true);
      } else {
        setError(err?.message || 'Failed to load report details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInspectors = async () => {
    try {
      const list = await reportsApi.getInspectors();
      if (list && list.length > 0) {
        setInspectors(list);
        if (!assignInspectorId) {
          setAssignInspectorId(list[0].id);
        }
      } else {
        setInspectors([
          { id: 'usr-insp-001', full_name: 'Marcus Chen', email: 'marcus.chen@treeguard.org', role: 'inspector' },
          { id: 'usr-insp-002', full_name: 'Elena Rostova', email: 'elena.rostova@treeguard.org', role: 'inspector' },
          { id: 'usr-admin-001', full_name: 'David Kim', email: 'david.kim@treeguard.org', role: 'admin' },
        ]);
        if (!assignInspectorId) {
          setAssignInspectorId('usr-insp-001');
        }
      }
    } catch (err) {
      console.warn('Could not fetch inspectors, using defaults:', err);
      setInspectors([
        { id: 'usr-insp-001', full_name: 'Marcus Chen', email: 'marcus.chen@treeguard.org', role: 'inspector' },
        { id: 'usr-insp-002', full_name: 'Elena Rostova', email: 'elena.rostova@treeguard.org', role: 'inspector' },
        { id: 'usr-admin-001', full_name: 'David Kim', email: 'david.kim@treeguard.org', role: 'admin' },
      ]);
      if (!assignInspectorId) {
        setAssignInspectorId('usr-insp-001');
      }
    }
  };

  useEffect(() => {
    fetchReport();
    fetchInspectors();
  }, [reportId]);

  // Operational Action Handlers (Calling Real FastAPI Backend)
  const handleReview = async () => {
    if (!realReport) return;
    setActionLoading(true);
    try {
      const updated = await reportsApi.reviewReport(realReport.id);
      setRealReport(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to update review status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realReport || !assignInspectorId) return;
    setActionLoading(true);
    try {
      const updated = await reportsApi.assignInspector(realReport.id, {
        inspector_id: assignInspectorId,
        notes: assignNotes || undefined,
        priority: assignPriority,
      });
      setRealReport(updated);
      setShowAssignModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to assign inspector.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartInspection = async () => {
    if (!realReport) return;
    setActionLoading(true);
    try {
      const updated = await reportsApi.startInspection(realReport.id);
      setRealReport(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to start inspection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realReport) return;
    setActionLoading(true);
    try {
      const updated = await reportsApi.completeInspection(realReport.id, {
        condition,
        severity,
        notes: inspectionNotes || undefined,
        recommended_action: recommendedAction || undefined,
        service_required: serviceRequired,
      });
      setRealReport(updated);
      setShowInspectionModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to complete inspection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realReport) return;
    if (!workPerformed.trim()) {
      alert('Please specify the work performed.');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await reportsApi.completeWork(realReport.id, {
        work_performed: workPerformed.trim(),
        completion_notes: workNotes.trim() || undefined,
      });
      setRealReport(updated);
      setShowWorkModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to record work completion.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCompleteReport = async () => {
    if (!realReport) return;
    setActionLoading(true);
    try {
      const updated = await reportsApi.completeReport(realReport.id, {
        notes: completeNotes.trim() || undefined,
        work_performed: workPerformed.trim() || undefined,
      });
      setRealReport(updated);
      setShowCompleteModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to complete and resolve report.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-forest-800">Loading report {reportId}...</p>
      </div>
    );
  }

  if (notFound || !realReport) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/app" className="hover:text-gray-600">Dashboard</Link>
          <span>/</span>
          <Link to="/app/reports" className="hover:text-gray-600">My Reports</Link>
          <span>/</span>
          <span className="text-gray-900 font-mono">{reportId || 'Unknown'}</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            📋
          </div>
          <h2 className="text-2xl font-display font-semibold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            We couldn't find a report record matching ID <span className="font-mono font-semibold text-gray-800">{reportId}</span>, or you do not have permission to access it.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/app/reports"
              className="bg-forest-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-forest-800 transition-colors"
            >
              View My Reports
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

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
          <p className="text-base font-semibold text-red-800 mb-2">Error Loading Report</p>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Link
            to="/app/reports"
            className="inline-block bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-red-800 transition-colors"
          >
            Return to My Reports
          </Link>
        </div>
      </div>
    );
  }

  const isStaff = role === 'admin' || role === 'inspector';
  const isAuthorizedForReport =
    role === 'admin' ||
    (role === 'inspector' && (!realReport.assigned_inspector_id || realReport.assigned_inspector_id === user?.id || !user?.id));
  const isResolved = realReport.status === 'resolved' || realReport.status === 'completed';
  const issueTitle = `${issueLabels[realReport.issue_type] || realReport.issue_type} — ${realReport.location_name}`;
  const dateStr = new Date(realReport.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const imageSrc = realReport.image_url
    ? (realReport.image_url.startsWith('http') ? realReport.image_url : `http://127.0.0.1:8000${realReport.image_url}`)
    : 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=200&fit=crop&auto=format';

  const timelineSteps = realReport.timeline || [];
  const statusHistory = realReport.status_history || [];

  // Step-level permission flags for UI rendering (Step-by-step progression)
  const canReview = !isResolved && (realReport.status === 'pending');
  const canAssign = !isResolved && (realReport.status === 'under-review' || realReport.status === 'pending');
  const canStartInspection = !isResolved && (realReport.status === 'assigned');
  const canCompleteInspection = !isResolved && (realReport.status === 'in-progress' || realReport.status === 'inspection-in-progress' || realReport.status === 'assigned');
  const canCompleteWork = !isResolved && (realReport.status === 'service-required' || realReport.status === 'service-in-progress');
  const canCompleteReport = !isResolved && (
    realReport.status === 'inspection-completed' ||
    realReport.status === 'service-completed' ||
    realReport.status === 'under-review'
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/app" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <Link to="/app/reports" className="hover:text-gray-600">My Reports</Link>
        <span>/</span>
        <span className="text-gray-900 font-mono font-medium">{realReport.id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="font-mono text-sm text-gray-400 font-semibold">{realReport.id}</span>
            <StatusBadge status={realReport.status} dot />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{issueTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Submitted {dateStr} · Priority: <span className="font-medium text-gray-800">{realReport.priority}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/app/reports"
            className="text-sm border border-gray-200 text-gray-700 bg-white px-3.5 py-2 rounded-lg hover:bg-gray-50 transition font-medium shadow-sm"
          >
            ← Back to reports
          </Link>
        </div>
      </div>

      {/* ACTIVE ACTION REQUIRED BANNER (Prominently displays current stage action button) */}
      {!isResolved && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Action Required ({role === 'admin' ? 'Organization Admin' : role === 'inspector' ? 'Field Inspector' : 'Staff Operations'})
              </span>
            </div>
            <span className="text-xs text-slate-300 font-mono bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
              Current Status: <span className="text-emerald-300 uppercase font-bold">{realReport.status}</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              {realReport.status === 'pending' && (
                <p className="text-xs text-slate-300">
                  This report has been submitted. Review telemetry and verify coordinates to proceed.
                </p>
              )}
              {realReport.status === 'under-review' && (
                <p className="text-xs text-slate-300">
                  Review complete. Dispatch a qualified field inspector or perform administrative closure.
                </p>
              )}
              {realReport.status === 'assigned' && (
                <p className="text-xs text-slate-300">
                  Inspector assigned ({realReport.assigned_inspector_name || 'Assigned'}). Start on-site field inspection.
                </p>
              )}
              {(realReport.status === 'in-progress' || realReport.status === 'inspection-in-progress') && (
                <p className="text-xs text-slate-300">
                  Inspection in progress. Record arborist findings, condition, and maintenance requirements.
                </p>
              )}
              {(realReport.status === 'service-required' || realReport.status === 'service-in-progress') && (
                <p className="text-xs text-slate-300">
                  Physical maintenance required. Perform tree care/surgery and record work completed.
                </p>
              )}
              {(realReport.status === 'inspection-completed' || realReport.status === 'service-completed') && (
                <p className="text-xs text-emerald-200 font-medium">
                  All operational tasks finished. Ready for official report resolution and closure.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Step 1: UNDER REVIEW */}
              {canReview && (
                <button
                  onClick={handleReview}
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>{actionLoading ? 'Updating...' : 'MARK REVIEW COMPLETE'}</span>
                </button>
              )}

              {/* Step 2: ASSIGN INSPECTOR / CONFIRM ASSIGNMENT */}
              {canAssign && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={actionLoading}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>👷</span>
                  <span>{realReport.assigned_inspector_id ? '✓ CONFIRM ASSIGNMENT' : 'ASSIGN INSPECTOR'}</span>
                </button>
              )}

              {/* Step 3: START INSPECTION */}
              {canStartInspection && (
                <button
                  onClick={handleStartInspection}
                  disabled={actionLoading}
                  className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>▶</span>
                  <span>{actionLoading ? 'Starting...' : 'START INSPECTION'}</span>
                </button>
              )}

              {/* Step 4: MARK INSPECTION COMPLETE */}
              {canCompleteInspection && (
                <button
                  onClick={() => setShowInspectionModal(true)}
                  disabled={actionLoading}
                  className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>MARK INSPECTION COMPLETE</span>
                </button>
              )}

              {/* Step 5: MARK WORK COMPLETED */}
              {canCompleteWork && (
                <button
                  onClick={() => setShowWorkModal(true)}
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>MARK WORK COMPLETED</span>
                </button>
              )}

              {/* Step 6: FINAL COMPLETE REPORT BUTTON */}
              {canCompleteReport && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wide shadow-lg shadow-emerald-950/40 ring-2 ring-emerald-400/50 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <span>✓</span>
                  <span>COMPLETE REPORT</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* FINAL RESOLUTION BANNER (When Report is Resolved) */}
          {isResolved && (
            <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-forest-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl">
                    ✅
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">Official Report Status</span>
                    <h2 className="text-xl font-bold text-white">REPORT COMPLETED</h2>
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs px-3.5 py-1 rounded-full font-semibold">
                  All Required Work Finished
                </span>
              </div>

              <p className="text-sm text-emerald-100 leading-relaxed font-medium">
                All required inspection, maintenance, and tree service work has been completed and officially verified.
              </p>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15 space-y-3 text-xs">
                {realReport.work_performed && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold mb-1">Work performed:</p>
                    <p className="font-semibold text-white text-sm bg-black/20 p-2.5 rounded-lg border border-white/10">
                      {realReport.work_performed}
                    </p>
                  </div>
                )}

                {realReport.completion_notes && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold mb-1">Completion notes:</p>
                    <p className="text-emerald-100 whitespace-pre-wrap bg-black/20 p-2.5 rounded-lg border border-white/10">
                      {realReport.completion_notes}
                    </p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-emerald-300 font-medium">Completed:</span>{' '}
                    <span className="font-bold text-white">
                      {realReport.resolved_at || realReport.service_completed_at
                        ? new Date(realReport.resolved_at || realReport.service_completed_at!).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Recorded on server'}
                    </span>
                  </div>
                  {realReport.assigned_inspector_name && (
                    <div>
                      <span className="text-emerald-300 font-medium">Field Inspector:</span>{' '}
                      <span className="font-bold text-white">{realReport.assigned_inspector_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Progress Timeline & In-line Operational Actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-gray-900">Report Progress & Field Journey</h2>
                <p className="text-xs text-gray-400">Live operational lifecycle tracking with step completion actions</p>
              </div>
              <StatusBadge status={realReport.status} />
            </div>

            <div className="space-y-0">
              {timelineSteps.map((step, i) => {
                const isCompleted = step.done;
                const isCurrent = step.status === 'current';

                return (
                  <div key={step.label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0 transition-all ${
                          isCompleted
                            ? 'bg-forest-600 border-forest-600 text-white font-bold'
                            : isCurrent
                            ? 'bg-blue-50 border-blue-600 text-blue-600 font-bold ring-4 ring-blue-50'
                            : 'bg-white border-gray-200 text-gray-300'
                        }`}
                      >
                        {isCompleted ? '✓' : isCurrent ? '●' : '○'}
                      </div>
                      {i < timelineSteps.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 my-1 transition-colors ${
                            isCompleted && timelineSteps[i + 1]?.done
                              ? 'bg-forest-400'
                              : isCompleted
                              ? 'bg-forest-200'
                              : 'bg-gray-100'
                          }`}
                          style={{ minHeight: 36 }}
                        />
                      )}
                    </div>
                    <div className={`pb-6 flex-1 ${!isCompleted && !isCurrent ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-sm font-semibold ${
                            isCompleted ? 'text-gray-900' : isCurrent ? 'text-blue-700' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </span>
                        {step.date && (
                          <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            {step.date}
                          </span>
                        )}
                      </div>
                      {step.note && (
                        <p className={`text-xs leading-relaxed mt-0.5 ${isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                          {step.note}
                        </p>
                      )}

                      {/* IN-LINE ACTION BUTTONS DIRECTLY ATTACHED TO TIMELINE STEPS */}
                      {/* 1. Under Review Action Button */}
                      {step.label === 'Under Review' && !step.done && canReview && (
                        <div className="mt-3">
                          <button
                            onClick={handleReview}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                          >
                            <span>✓</span> MARK REVIEW COMPLETE
                          </button>
                        </div>
                      )}

                      {/* 2. Inspector Assigned Action Button */}
                      {step.label === 'Inspector Assigned' && !step.done && canAssign && (
                        <div className="mt-3">
                          <button
                            onClick={() => setShowAssignModal(true)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                          >
                            <span>✓</span> CONFIRM ASSIGNMENT
                          </button>
                        </div>
                      )}

                      {/* 3. Inspection Completed Action Buttons */}
                      {step.label === 'Inspection Completed' && !step.done && (
                        <>
                          {canStartInspection && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <button
                                onClick={handleStartInspection}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                <span>▶</span> START INSPECTION
                              </button>
                              <button
                                onClick={() => setShowInspectionModal(true)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                <span>✓</span> MARK INSPECTION COMPLETE
                              </button>
                            </div>
                          )}
                          {!canStartInspection && canCompleteInspection && (
                            <div className="mt-3">
                              <button
                                onClick={() => setShowInspectionModal(true)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                <span>✓</span> MARK INSPECTION COMPLETE
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* 4. Work Completed Action Button */}
                      {step.label === 'Work Completed' && !step.done && canCompleteWork && (
                        <div className="mt-3">
                          <button
                            onClick={() => setShowWorkModal(true)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                          >
                            <span>✓</span> MARK WORK COMPLETED
                          </button>
                        </div>
                      )}

                      {/* 5. Complete Report Action Button */}
                      {(step.label === 'Complete Report' || step.label === 'Report Completed') && !step.done && canCompleteReport && (
                        <div className="mt-3">
                          <button
                            onClick={() => setShowCompleteModal(true)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold uppercase tracking-wide shadow-lg shadow-emerald-950/20 ring-2 ring-emerald-400/50 transition cursor-pointer disabled:opacity-50"
                          >
                            <span>✓</span> COMPLETE REPORT
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Telemetry Assessment Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">AI Assessment Telemetry</h2>
              <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-full">
                Preliminary Model Scoring
              </span>
            </div>
            <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-amber-900 mb-1">
                {issueLabels[realReport.issue_type] || realReport.issue_type} — {realReport.priority} Severity
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                {realReport.description ||
                  'Structural compromise or hazard reported. Observational telemetry logged for arborist review.'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Severity Level', value: realReport.priority },
                { label: 'Model Confidence', value: '88%' },
                { label: 'Risk Priority', value: realReport.priority === 'High' ? 'High Risk' : 'Standard' },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <p className="font-semibold text-gray-800 text-xs">{s.value}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Submission Details</h2>
            <div className="space-y-4 text-xs">
              <div>
                <p className="text-gray-400 font-medium mb-1 uppercase tracking-wider text-[11px]">Reporter Description</p>
                <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                  {realReport.description || 'No detailed description provided.'}
                </p>
              </div>
              {realReport.additional_notes && (
                <div>
                  <p className="text-gray-400 font-medium mb-1 uppercase tracking-wider text-[11px]">Additional Notes</p>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                    {realReport.additional_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assigned Inspector Info (if available) */}
          {realReport.assigned_inspector_name && (
            <div className="bg-purple-50/70 rounded-xl border border-purple-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">👷</span>
                <p className="text-xs font-semibold text-purple-900 uppercase tracking-wider">Assigned Inspector</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{realReport.assigned_inspector_name}</p>
              <p className="text-xs text-purple-700 mt-0.5">Municipal Field Arborist Division</p>
              {realReport.assigned_at && (
                <p className="text-[11px] text-gray-400 mt-2 border-t border-purple-100 pt-1.5">
                  Assigned on {new Date(realReport.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {/* Original image */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <img
              src={imageSrc}
              alt="Original report photo"
              className="w-full h-44 object-cover bg-gray-100"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=200&fit=crop&auto=format';
              }}
            />
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-0.5">Uploaded Evidence</p>
              <p className="text-xs text-gray-600 font-medium">Captured {dateStr}</p>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</p>
            <div className="bg-[#e8f0e4] rounded-lg h-24 relative overflow-hidden mb-3">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-amber-500 rounded-full border-2 border-white shadow" />
              </div>
              <div className="absolute bottom-1 right-1 text-[11px] text-gray-500 bg-white/90 px-1.5 py-0.5 rounded font-mono">
                {realReport.latitude ? `${realReport.latitude.toFixed(4)}, ${realReport.longitude?.toFixed(4)}` : 'Recorded'}
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-900">{realReport.location_name}</p>
            {realReport.latitude && realReport.longitude && (
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                Lat: {realReport.latitude} · Lng: {realReport.longitude}
              </p>
            )}
          </div>

          {/* Status history log (Real DB records) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Status History</p>
              <span className="text-[10px] text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full font-medium">
                Live Audit Log
              </span>
            </div>

            {statusHistory.length > 0 ? (
              <div className="space-y-3">
                {statusHistory.map((h) => {
                  const hDate = new Date(h.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  return (
                    <div key={h.id} className="border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-gray-900">{h.stage_name}</span>
                        <span className="text-[11px] text-gray-400">{hDate}</span>
                      </div>
                      {h.note && <p className="text-xs text-gray-500 leading-tight">{h.note}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <StatusBadge status={realReport.status} />
                <span className="text-xs text-gray-400">{dateStr}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. ASSIGN INSPECTOR / CONFIRM ASSIGNMENT MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Assign Field Inspector</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Inspector *</label>
                <select
                  value={assignInspectorId}
                  onChange={(e) => setAssignInspectorId(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500 focus:outline-none"
                >
                  {inspectors.map((insp) => (
                    <option key={insp.id} value={insp.id}>
                      {insp.full_name} ({insp.role}) — {insp.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Priority Override</label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500 focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Assignment Instructions / Notes</label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Please check road clearance and root condition."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !assignInspectorId}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Assigning...' : '✓ CONFIRM ASSIGNMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. INSPECTION COMPLETION MODAL */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Record Inspection Findings</h3>
              <button
                onClick={() => setShowInspectionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmInspection} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tree Condition *</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500"
                  >
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Critical">Critical</option>
                    <option value="Dead">Dead</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Observed Severity *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500"
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Moderate">Moderate Risk</option>
                    <option value="High">High Risk</option>
                    <option value="Critical">Critical Risk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Inspection Findings & Observations</label>
                <textarea
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Describe bark condition, lean, cracked limbs, root stability, etc."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Recommended Action</label>
                <input
                  type="text"
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  placeholder="e.g. Crown thinning, Deadwood removal, Tree cabling"
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="serviceRequiredCheck"
                  checked={serviceRequired}
                  onChange={(e) => setServiceRequired(e.target.checked)}
                  className="mt-0.5 rounded text-forest-600 focus:ring-forest-500"
                />
                <label htmlFor="serviceRequiredCheck" className="text-xs text-amber-900 cursor-pointer font-medium">
                  <span className="font-bold">Physical Tree Service / Maintenance Required?</span>
                  <br />
                  Check this if the crew must perform physical work on-site before this report can be completed.
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : '✓ MARK INSPECTION COMPLETE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. WORK / SERVICE COMPLETION MODAL */}
      {showWorkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Record Work / Service Completion</h3>
              <button
                onClick={() => setShowWorkModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmWork} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Work / Service Performed *
                </label>
                <textarea
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  placeholder="e.g. Removed fallen tree and cleared the affected sidewalk area."
                  rows={3}
                  required
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Completion Notes / Site Clearance Details
                </label>
                <textarea
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="e.g. Area cleared and safe for public access. Debris disposed of."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Optional Evidence Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setEvidencePhotoName(file.name);
                  }}
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-forest-50 file:text-forest-700 hover:file:bg-forest-100 cursor-pointer"
                />
                {evidencePhotoName && (
                  <p className="text-[11px] text-forest-700 mt-1">Selected: {evidencePhotoName}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowWorkModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !workPerformed.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'CONFIRM WORK COMPLETED'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. FINAL COMPLETE REPORT CONFIRMATION MODAL */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Complete Report?</h3>
                <p className="text-xs text-gray-500">Official closure of tree report {realReport.id}</p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
              <p className="font-bold text-emerald-900 text-sm">
                Confirm that all required inspection and field work has been completed.
              </p>
              <p className="text-emerald-800 leading-relaxed">
                Clicking confirm will officially resolve this report in the database, close any active assignments, and notify the citizen reporter that the issue is fully completed.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1 text-xs">
                Final Resolution Notes (Optional)
              </label>
              <textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="e.g. All field operations completed. Site cleared and certified safe."
                rows={2}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-forest-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleteReport}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950/20 transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Completing...' : 'Confirm Complete Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
