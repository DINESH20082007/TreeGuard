import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import StatusBadge from '../../components/StatusBadge';
import {
  inspectorApi,
  InspectorAssignment,
  InspectionStatus,
  ServiceStatus,
} from '../../services/inspector';

const priorityColors: Record<string, string> = {
  Emergency: 'text-red-600 bg-red-50 border-red-100',
  High: 'text-red-600 bg-red-50 border-red-100',
  Medium: 'text-amber-600 bg-amber-50 border-amber-100',
  Low: 'text-gray-500 bg-gray-100 border-gray-200',
};

const inspectionStatusStyles: Record<InspectionStatus, string> = {
  'Assigned': 'bg-gray-100 text-gray-700 border-gray-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Inspection Completed': 'bg-green-50 text-green-700 border-green-200',
  'Follow-up Required': 'bg-amber-50 text-amber-700 border-amber-200',
};

const serviceStatusStyles: Record<ServiceStatus, string> = {
  'Not Required': 'bg-gray-100 text-gray-600 border-gray-200',
  'Required': 'bg-amber-50 text-amber-700 border-amber-200',
  'Service In Progress': 'bg-purple-50 text-purple-700 border-purple-200',
  'Service Completed': 'bg-green-50 text-green-700 border-green-200',
};

export default function InspectionDetail() {
  const { id } = useParams();
  const caseId = id || '';

  const [assignment, setAssignment] = useState<InspectorAssignment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Field Form State
  const [condition, setCondition] = useState('Fair');
  const [severity, setSeverity] = useState('Moderate');
  const [structuralConcern, setStructuralConcern] = useState('None observed');
  const [immediateAction, setImmediateAction] = useState('Yes — within 14 days');
  const [notes, setNotes] = useState('');
  const [serviceRequired, setServiceRequired] = useState<boolean>(false);

  // Service Maintenance State
  const [servicePerformed, setServicePerformed] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  // Modals
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showWorkCompletedModal, setShowWorkCompletedModal] = useState(false);
  const [followUpReason, setFollowUpReason] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadAssignment() {
      if (!caseId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const data = await inspectorApi.getAssignmentById(caseId);
        if (isMounted) {
          setAssignment(data);
          if (data.notes) setNotes(data.notes);
          setServiceRequired(Boolean(data.service_required));
          if (data.service_performed) setServicePerformed(data.service_performed);
          if (data.service_notes) setServiceNotes(data.service_notes);
        }
      } catch (err: any) {
        if (isMounted) {
          if (err?.status === 404 || err?.message?.toLowerCase().includes('not found') || err?.message?.includes('404')) {
            setNotFound(true);
          } else {
            setError(err?.message || 'Failed to load assignment details.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAssignment();
    return () => {
      isMounted = false;
    };
  }, [caseId]);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  // 1. Action: Start Inspection
  const handleStartInspection = async () => {
    if (!assignment) return;
    setActionLoading('start_inspection');
    setError(null);
    try {
      const updated = await inspectorApi.updateWorkflow(assignment.id, {
        action: 'start_inspection',
      });
      setAssignment(updated);
      showNotification('Inspection status updated to In Progress.');
    } catch (err: any) {
      setError(err?.message || 'Failed to start inspection.');
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Action: Mark Inspection Completed
  const handleCompleteInspection = async () => {
    if (!assignment) return;
    setActionLoading('complete_inspection');
    setError(null);

    const findingsNotes = [
      notes.trim() || 'Arborist field inspection conducted.',
      structuralConcern !== 'Select…' && structuralConcern !== 'None observed' ? `Structural Concern: ${structuralConcern}` : null,
      immediateAction !== 'Select…' ? `Action Schedule: ${immediateAction}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const updated = await inspectorApi.updateWorkflow(assignment.id, {
        action: 'complete_inspection',
        condition,
        severity,
        notes: findingsNotes,
        recommended_action: immediateAction,
        service_required: serviceRequired,
      });
      setAssignment(updated);
      setShowCompleteConfirm(false);
      showNotification(
        serviceRequired
          ? 'Inspection marked Completed! Service is marked as Required.'
          : 'Inspection marked Completed! Work order finalized.'
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to complete inspection.');
      setShowCompleteConfirm(false);
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Action: Mark Follow-up Required
  const handleFollowUpRequired = async () => {
    if (!assignment) return;
    setActionLoading('follow_up_required');
    setError(null);
    try {
      const updated = await inspectorApi.updateWorkflow(assignment.id, {
        action: 'follow_up_required',
        notes: followUpReason.trim() || 'Additional site observation required.',
      });
      setAssignment(updated);
      setShowFollowUpModal(false);
      setFollowUpReason('');
      showNotification('Inspection status updated to Follow-up Required.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update follow-up status.');
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Action: Start Service
  const handleStartService = async () => {
    if (!assignment) return;
    setActionLoading('start_service');
    setError(null);
    try {
      const updated = await inspectorApi.updateWorkflow(assignment.id, {
        action: 'start_service',
        service_required: true,
      });
      setAssignment(updated);
      showNotification('Service status updated to Service In Progress.');
    } catch (err: any) {
      setError(err?.message || 'Failed to start service.');
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Action: Complete Service / Work
  const handleCompleteService = async () => {
    if (!assignment) return;
    if (!servicePerformed.trim()) {
      setError('Please specify the service/maintenance performed before marking completed.');
      return;
    }
    setActionLoading('complete_service');
    setError(null);
    try {
      const updated = await inspectorApi.updateWorkflow(assignment.id, {
        action: 'complete_work',
        service_performed: servicePerformed.trim(),
        service_notes: serviceNotes.trim() || 'Maintenance successfully conducted.',
        work_performed: servicePerformed.trim(),
        completion_notes: serviceNotes.trim() || 'Maintenance successfully conducted.',
      });
      setAssignment(updated);
      showNotification('Work completed and persisted to database!');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete service.');
    } finally {
      setActionLoading(null);
    }
  };

  // 6. Action: Confirm Work Completed (Dedicated Modal Handler)
  const handleConfirmWorkCompleted = async () => {
    if (!assignment) return;
    const workText = servicePerformed.trim() || 'Removed fallen branch and cleared the affected area.';
    const notesText = serviceNotes.trim() || 'Area checked after cleanup and no immediate obstruction remains.';
    
    setActionLoading('complete_work');
    setError(null);
    try {
      const updated = await inspectorApi.updateWorkflow(assignment.id, {
        action: 'complete_work',
        service_performed: workText,
        service_notes: notesText,
        work_performed: workText,
        completion_notes: notesText,
      });
      setAssignment(updated);
      setServicePerformed(workText);
      setServiceNotes(notesText);
      setShowWorkCompletedModal(false);
      showNotification('Work Completed recorded! Linked citizen report is now marked as RESOLVED.');
    } catch (err: any) {
      setError(err?.message || 'Failed to record work completion.');
      setShowWorkCompletedModal(false);
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Service Required
  const handleToggleServiceRequired = async (required: boolean) => {
    setServiceRequired(required);
    if (!assignment) return;
    try {
      const updated = await inspectorApi.updateWorkflow(assignment.id, {
        service_required: required,
      });
      setAssignment(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to update service requirement.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-forest-800">Loading field assignment {caseId}...</p>
      </div>
    );
  }

  if (notFound || !assignment) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/app/inspector" className="hover:text-gray-600">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-900 font-mono">{caseId || 'Unknown'}</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            👷
          </div>
          <h2 className="text-2xl font-display font-semibold text-gray-900 mb-2">Assignment Not Found</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            We couldn't find an inspection work order matching ID <span className="font-mono font-semibold text-gray-800">{caseId}</span>, or it may belong to another field inspector.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/app/inspector"
              className="bg-forest-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-forest-800 transition-colors"
            >
              Back to Inspector Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const assignedDateStr = new Date(assignment.assigned_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const imageSrc = assignment.image_url
    ? (assignment.image_url.startsWith('http') ? assignment.image_url : `http://127.0.0.1:8000${assignment.image_url}`)
    : 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400&h=400&fit=crop&auto=format';

  const currentInspectionStatus: InspectionStatus = assignment.inspection_status || 'Assigned';
  const currentServiceStatus: ServiceStatus = assignment.service_status || 'Not Required';
  const isInspectionDone = currentInspectionStatus === 'Inspection Completed';
  const isServiceDone = currentServiceStatus === 'Service Completed';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/app/inspector" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-mono">{assignment.id}</span>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between shadow-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 text-xs font-semibold cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="font-mono text-sm text-gray-400 font-semibold">{assignment.id}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${priorityColors[assignment.priority] || 'text-gray-600 bg-gray-100'}`}>
              {assignment.priority} Priority
            </span>
            <StatusBadge status={assignment.status} dot />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{assignment.title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Assigned {assignedDateStr} · Location: {assignment.location_name}
          </p>
        </div>

        {assignment.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <span>✓</span>
            <span>Work Order Completed</span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Tree Info + AI Assessment */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex gap-4 mb-4">
              <img
                src={imageSrc}
                alt="Tree"
                className="w-24 h-24 rounded-xl object-cover bg-gray-100 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Tree ID</p>
                <p className="font-semibold text-gray-900 mb-1 truncate">
                  {assignment.tree_id || 'Urban Tree'} · {assignment.title.split('—')[0]}
                </p>
                <p className="text-sm text-gray-500 mb-2 truncate">{assignment.location_name}</p>
                {assignment.tree_id && (
                  <Link to={`/app/tree/${assignment.tree_id}`} className="text-xs text-forest-700 hover:underline font-medium inline-block">
                    View Tree History & Profile →
                  </Link>
                )}
              </div>
            </div>
            {assignment.ai_assessment && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3.5">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-0.5">
                  AI Assessment (pre-inspection telemetry)
                </p>
                <p className="text-sm text-amber-800">{assignment.ai_assessment}</p>
              </div>
            )}
          </div>

          {/* ====================================================== */}
          {/* 1. INSPECTION STATUS SECTION */}
          {/* ====================================================== */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Section 1</p>
                <h2 className="text-lg font-semibold text-gray-900">INSPECTION STATUS</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${inspectionStatusStyles[currentInspectionStatus] || 'bg-gray-100 text-gray-700'}`}>
                  {currentInspectionStatus}
                </span>
              </div>
            </div>

            {/* Inspection State 1: ASSIGNED (Not started yet) */}
            {currentInspectionStatus === 'Assigned' && (
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                <p className="text-sm text-gray-600">
                  This work order is currently <strong>Assigned</strong>. Start the field inspection to begin logging observational findings.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={handleStartInspection}
                    disabled={actionLoading === 'start_inspection'}
                    className="bg-forest-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    <span>▶</span>
                    <span>{actionLoading === 'start_inspection' ? 'Starting...' : 'Start Inspection'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Inspection State 2: IN PROGRESS / FOLLOW-UP REQUIRED */}
            {(currentInspectionStatus === 'In Progress' || currentInspectionStatus === 'Follow-up Required') && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual condition observed <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Good', 'Fair', 'Poor', 'Critical'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCondition(c)}
                        className={`py-2.5 text-sm font-medium rounded-lg border-2 transition-all cursor-pointer ${
                          condition === c
                            ? 'border-forest-600 bg-forest-50 text-forest-700 font-semibold'
                            : 'border-gray-100 text-gray-600 hover:border-gray-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Damage severity <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['None', 'Minor', 'Moderate', 'Severe'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeverity(s)}
                        className={`py-2.5 text-sm font-medium rounded-lg border-2 transition-all cursor-pointer ${
                          severity === s
                            ? 'border-forest-600 bg-forest-50 text-forest-700 font-semibold'
                            : 'border-gray-100 text-gray-600 hover:border-gray-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Structural concern</label>
                    <select
                      value={structuralConcern}
                      onChange={(e) => setStructuralConcern(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                    >
                      <option>None observed</option>
                      <option>Included bark union</option>
                      <option>Crown dieback</option>
                      <option>Root zone damage</option>
                      <option>Cavity / decay</option>
                      <option>Branch fracture</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action recommendation</label>
                    <select
                      value={immediateAction}
                      onChange={(e) => setImmediateAction(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                    >
                      <option>Yes — emergency removal</option>
                      <option>Yes — within 7 days</option>
                      <option>Yes — within 14 days</option>
                      <option>Yes — within 30 days</option>
                      <option>No — regular monitoring</option>
                      <option>No action needed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Inspection notes & findings</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe your arborist findings, trunk integrity, canopy observations..."
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none"
                  />
                </div>

                {/* Inspection Actions */}
                <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCompleteConfirm(true)}
                    className="bg-forest-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>✓</span>
                    <span>Mark Inspection Completed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFollowUpModal(true)}
                    className="border border-amber-300 text-amber-800 bg-amber-50 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>⏳</span>
                    <span>Mark Follow-up Required</span>
                  </button>
                </div>
              </div>
            )}

            {/* Inspection State 3: INSPECTION COMPLETED */}
            {isInspectionDone && (
              <div className="p-4 bg-green-50/60 border border-green-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-green-800 text-sm font-semibold">
                  <span>✓</span>
                  <span>Inspection findings recorded & saved to database.</span>
                </div>
                {assignment.inspection_completed_at && (
                  <p className="text-xs text-green-700">
                    Completed at: {new Date(assignment.inspection_completed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
                {assignment.notes && (
                  <div className="bg-white/80 border border-green-200 rounded-lg p-3 text-xs text-gray-700 leading-relaxed font-mono whitespace-pre-wrap">
                    {assignment.notes}
                  </div>
                )}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFollowUpModal(true)}
                    className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
                  >
                    Need another visit? Mark Follow-up Required →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ====================================================== */}
          {/* 2. SERVICE / MAINTENANCE SECTION */}
          {/* ====================================================== */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Section 2</p>
                <h2 className="text-lg font-semibold text-gray-900">SERVICE / MAINTENANCE</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${serviceStatusStyles[currentServiceStatus] || 'bg-gray-100 text-gray-600'}`}>
                  {currentServiceStatus}
                </span>
              </div>
            </div>

            {/* Service Required Toggle */}
            <div className="mb-5 p-4 bg-gray-50/80 border border-gray-100 rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Service Required:</p>
                  <p className="text-xs text-gray-500">Does this tree require physical pruning, cable bracing, or emergency removal?</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleServiceRequired(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      serviceRequired
                        ? 'bg-forest-700 text-white border-forest-700'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleServiceRequired(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      !serviceRequired
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            {/* When Service Required = YES */}
            {serviceRequired ? (
              <div className="space-y-4">
                {!isServiceDone ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Work / Service Performed <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={servicePerformed}
                        onChange={(e) => setServicePerformed(e.target.value)}
                        placeholder="e.g. Removed fallen branch and cleared the affected area."
                        className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Completion Notes
                      </label>
                      <textarea
                        value={serviceNotes}
                        onChange={(e) => setServiceNotes(e.target.value)}
                        rows={3}
                        placeholder="e.g. Area checked after cleanup and no immediate obstruction remains."
                        className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none"
                      />
                    </div>

                    {/* Service Actions */}
                    <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-3 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (!servicePerformed.trim()) {
                            setServicePerformed('Removed fallen branch and cleared the affected area.');
                          }
                          if (!serviceNotes.trim()) {
                            setServiceNotes('Area checked after cleanup and no immediate obstruction remains.');
                          }
                          setShowWorkCompletedModal(true);
                        }}
                        className="bg-forest-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-forest-800 transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                      >
                        <span>✓</span>
                        <span>Mark Work Completed</span>
                      </button>

                      {currentServiceStatus === 'Required' && (
                        <button
                          type="button"
                          onClick={handleStartService}
                          disabled={actionLoading === 'start_service'}
                          className="bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-purple-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>▶</span>
                          <span>{actionLoading === 'start_service' ? 'Starting...' : 'Mark Service In Progress'}</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* When Service is DONE */
                  <div className="p-4 bg-green-50/70 border border-green-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-900 font-bold text-sm">
                        <span>✅</span>
                        <span>WORK COMPLETED</span>
                      </div>
                      <span className="text-[11px] bg-green-200 text-green-900 px-2 py-0.5 rounded-full font-semibold">
                        Resolved in Database
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-gray-500 font-medium">Work Performed:</p>
                        <p className="font-semibold text-gray-900 bg-white/90 p-2 rounded-lg border border-green-100">
                          {assignment.service_performed || servicePerformed || 'Tree maintenance & emergency work completed.'}
                        </p>
                      </div>

                      {(assignment.service_notes || serviceNotes) && (
                        <div>
                          <p className="text-gray-500 font-medium">Completion Notes:</p>
                          <p className="text-gray-800 bg-white/90 p-2 rounded-lg border border-green-100 whitespace-pre-wrap">
                            {assignment.service_notes || serviceNotes}
                          </p>
                        </div>
                      )}

                      {assignment.service_completed_at && (
                        <div className="flex items-center justify-between text-[11px] text-green-800 pt-1 border-t border-green-200/60">
                          <span>Completed At:</span>
                          <span className="font-semibold">
                            {new Date(assignment.service_completed_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* When Service Required = NO */
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <p className="text-sm font-medium text-gray-700">No physical service / maintenance required for this tree.</p>
                <p className="text-xs text-gray-400 mt-1">If service becomes needed following field review, select "Yes" above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Work Order Details</p>
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Assigned</span>
                <span className="font-medium">{assignedDateStr}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Inspection Status</span>
                <span className="font-semibold text-forest-700">{currentInspectionStatus}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Service Required</span>
                <span className="font-semibold text-gray-800">{serviceRequired ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">Service Status</span>
                <span className="font-semibold text-purple-700">{currentServiceStatus}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Priority</span>
                <span className="font-semibold text-red-600">{assignment.priority}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Location Coordinates</p>
            <div className="bg-[#e8f0e4] rounded-lg h-28 relative overflow-hidden mb-3">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow" />
              </div>
              <div className="absolute bottom-1 right-1 text-xs text-gray-400 bg-white/80 px-1.5 py-0.5 rounded font-mono">
                {assignment.latitude ? `${assignment.latitude.toFixed(4)}, ${assignment.longitude?.toFixed(4)}` : 'Recorded'}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-800">{assignment.location_name}</p>
            <Link
              to={`/app/map?treeId=${assignment.tree_id || ''}`}
              className="mt-2 text-xs text-forest-600 font-medium hover:text-forest-700 inline-block"
            >
              Open in Tree Map →
            </Link>
          </div>
        </div>
      </div>

      {/* Modal 1: Complete Inspection Confirmation */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-semibold text-gray-900 mb-2">Mark Inspection Completed?</h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              This will record condition (<strong>{condition}</strong>), damage severity (<strong>{severity}</strong>), and update the municipal tree registry.
              {serviceRequired ? (
                <span className="block mt-2 text-amber-700 font-medium bg-amber-50 p-2 rounded-lg text-xs">
                  ⚠️ Service is marked as Required. You will be able to perform physical service and click "Mark Work Completed" to resolve this issue.
                </span>
              ) : null}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCompleteInspection}
                disabled={actionLoading === 'complete_inspection'}
                className="flex-1 bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {actionLoading === 'complete_inspection' ? 'Saving...' : 'Confirm & Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(false)}
                disabled={actionLoading === 'complete_inspection'}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Follow-up Required Prompt */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-semibold text-gray-900 mb-2">Mark Follow-up Required</h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Indicate why a follow-up visit or specialized assessment is needed for this tree.
            </p>
            <textarea
              value={followUpReason}
              onChange={(e) => setFollowUpReason(e.target.value)}
              rows={3}
              placeholder="e.g. Drone canopy check needed, aerial lift required, or seasonal re-evaluation..."
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleFollowUpRequired}
                disabled={actionLoading === 'follow_up_required'}
                className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-amber-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {actionLoading === 'follow_up_required' ? 'Saving...' : 'Save Follow-up'}
              </button>
              <button
                type="button"
                onClick={() => setShowFollowUpModal(false)}
                disabled={actionLoading === 'follow_up_required'}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Final Work Completed Confirmation */}
      {showWorkCompletedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-gray-900 text-base">Confirm Work Completed</h3>
              <span className="text-xs bg-green-100 text-green-800 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>✓</span> Work Completed: Yes
              </span>
            </div>

            <div className="space-y-4 text-xs text-gray-700">
              <div className="bg-green-50/70 border border-green-200/80 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-green-900">Physical Work Status:</span>
                  <span className="font-bold text-green-700 uppercase tracking-wide">Work Completed (Yes)</span>
                </div>
                <p className="text-[11px] text-green-800">
                  Confirming will save this physical completion to the backend and resolve the linked citizen report.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Work / Service Performed <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={servicePerformed}
                  onChange={(e) => setServicePerformed(e.target.value)}
                  placeholder="e.g. Removed fallen branch and cleared the affected area."
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Completion Notes
                </label>
                <textarea
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Area checked after cleanup and no immediate obstruction remains."
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 resize-none"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 text-[11px] text-gray-500 flex justify-between items-center">
                <span>Completion Timestamp:</span>
                <span className="font-medium text-gray-700">Generated automatically by backend server</span>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={handleConfirmWorkCompleted}
                disabled={actionLoading === 'complete_work' || !servicePerformed.trim()}
                className="flex-1 bg-forest-700 text-white py-2.5 rounded-lg font-semibold text-xs hover:bg-forest-800 transition-colors disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>✓</span>
                <span>{actionLoading === 'complete_work' ? 'Submitting...' : 'Confirm Work Completed'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWorkCompletedModal(false)}
                disabled={actionLoading === 'complete_work'}
                className="px-4 border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
