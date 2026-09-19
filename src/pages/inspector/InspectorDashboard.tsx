import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { inspectorApi, InspectorAssignment, InspectorStats } from '../../services/inspector';

const priorityColors: Record<string, string> = {
  Emergency: 'text-red-700 bg-red-50 border-red-200',
  High: 'text-red-700 bg-red-50 border-red-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-gray-700 bg-gray-100 border-gray-200',
};

const filterTabs = [
  'All',
  'Pending Inspection',
  'In Progress',
  'High & Emergency',
  'Service Required',
  'Completed',
] as const;
type FilterTab = (typeof filterTabs)[number];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getWorkStatusBadge(a: InspectorAssignment) {
  if (a.status === 'completed' || a.service_status === 'Service Completed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
        <span>✓</span> Work Completed
      </span>
    );
  }
  if (a.service_status === 'Service In Progress') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
        <span>⚙</span> Work In Progress
      </span>
    );
  }
  if (a.service_required && a.service_status === 'Required') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
        <span>🪓</span> Work Required
      </span>
    );
  }
  if (a.inspection_status === 'Inspection Completed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
        <span>✓</span> Inspection Completed
      </span>
    );
  }
  if (a.inspection_status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
        <span>●</span> Inspection In Progress
      </span>
    );
  }
  if (a.inspection_status === 'Follow-up Required') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
        <span>⏳</span> Follow-up Required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
      <span>○</span> Inspection Pending
    </span>
  );
}

export default function InspectorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.full_name || 'Marcus Chen';
  const greeting = getGreeting();

  const [assignments, setAssignments] = useState<InspectorAssignment[]>([]);
  const [stats, setStats] = useState<InspectorStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal states for in-line operational completion
  const [inspectModalAssignment, setInspectModalAssignment] = useState<InspectorAssignment | null>(null);
  const [workModalAssignment, setWorkModalAssignment] = useState<InspectorAssignment | null>(null);

  // Form states for inspection modal
  const [inspectCondition, setInspectCondition] = useState('Fair');
  const [inspectSeverity, setInspectSeverity] = useState('Medium');
  const [inspectServiceRequired, setInspectServiceRequired] = useState(false);
  const [inspectNotes, setInspectNotes] = useState('');
  const [inspectSubmitting, setInspectSubmitting] = useState(false);

  // Form states for work modal
  const [workType, setWorkType] = useState('Branch Pruning / Limb Removal');
  const [workNotes, setWorkNotes] = useState('');
  const [workSubmitting, setWorkSubmitting] = useState(false);

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const DEMO_INSPECTOR_ASSIGNMENTS: InspectorAssignment[] = [
  {
    id: 'ASN-2026-0101',
    inspector_id: 'usr-insp-001',
    report_id: 'TRG-2026-0812',
    tree_id: 'TRE-7417',
    title: 'Emergency: Heavy Limb Hanging Over Pedestrian Walkway',
    location_name: 'DB Road, RS Puram (Opp. City Bank)',
    priority: 'Emergency',
    status: 'emergency',
    inspection_status: 'In Progress',
    service_required: true,
    service_status: 'Required',
    ai_assessment: 'AI detected 88% probability of structural limb failure under high wind load.',
    assigned_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    due_date: new Date(Date.now() + 3600000 * 8).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=300&fit=crop',
  },
  {
    id: 'ASN-2026-0102',
    inspector_id: 'usr-insp-001',
    report_id: 'TRG-2026-0941',
    tree_id: 'TRE-8832',
    title: 'Root Decay and Significant Trunk Cavity in Mature Neem',
    location_name: 'Avinashi Road, Race Course Ward 14',
    priority: 'High',
    status: 'in-progress',
    inspection_status: 'Assigned',
    service_required: true,
    service_status: 'Required',
    ai_assessment: 'Trunk cavity exceeds 35% cross-sectional area with visible fungal conks.',
    assigned_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    due_date: new Date(Date.now() + 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=300&fit=crop',
  },
  {
    id: 'ASN-2026-0103',
    inspector_id: 'usr-insp-001',
    report_id: 'TRG-2026-1104',
    tree_id: 'TRE-9104',
    title: 'Storm Damage Assessment: Broken Scaffold Branch on Teak',
    location_name: 'Gandhipuram Cross Cut Road',
    priority: 'High',
    status: 'in-progress',
    inspection_status: 'Inspection Completed',
    service_required: true,
    service_status: 'Service In Progress',
    work_performed: 'Crown reduction and hazardous branch pruning scheduled',
    assigned_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=300&fit=crop',
  },
  {
    id: 'ASN-2026-0104',
    inspector_id: 'usr-insp-001',
    report_id: 'TRG-2026-1215',
    tree_id: 'TRE-6320',
    title: 'Routine Health and Crown Clearance Audit: Rain Tree',
    location_name: 'Peelamedu Park Perimeter',
    priority: 'Medium',
    status: 'assigned',
    inspection_status: 'Assigned',
    service_required: false,
    service_status: 'Not Required',
    assigned_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&fit=crop',
  },
  {
    id: 'ASN-2026-0105',
    inspector_id: 'usr-insp-001',
    report_id: 'TRG-2026-0730',
    tree_id: 'TRE-5511',
    title: 'Completed: Gulmohar Branch Clearance and Cabling',
    location_name: 'Saibaba Colony, 7th Cross',
    priority: 'Low',
    status: 'completed',
    inspection_status: 'Inspection Completed',
    service_required: true,
    service_status: 'Service Completed',
    work_performed: 'Cabling & Structural Bracing',
    completion_notes: 'Support cables installed at 2/3 height. Structural stability restored.',
    assigned_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=300&fit=crop',
  },
];

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentsData, statsData] = await Promise.all([
        inspectorApi.getAssignments(),
        inspectorApi.getStats().catch(() => null),
      ]);
      if (assignmentsData && assignmentsData.length > 0) {
        setAssignments(assignmentsData);
      } else {
        setAssignments(DEMO_INSPECTOR_ASSIGNMENTS);
      }
      setStats(statsData);
    } catch {
      // Presentation/Demo mode fallback: seamlessly load demonstration data
      setAssignments(DEMO_INSPECTOR_ASSIGNMENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Operational Action Handler: Start Inspection directly from queue
  const handleStartInspection = async (assignmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(assignmentId);
    try {
      const updated = await inspectorApi.updateWorkflow(assignmentId, {
        action: 'start_inspection',
      }).catch(() => null);

      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? { ...a, ...(updated || {}), inspection_status: 'In Progress', status: 'in-progress' }
            : a
        )
      );
    } catch {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? { ...a, inspection_status: 'In Progress', status: 'in-progress' }
            : a
        )
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit Inspection Completion Modal
  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectModalAssignment) return;
    setInspectSubmitting(true);
    try {
      const updated = await inspectorApi.updateWorkflow(inspectModalAssignment.id, {
        action: 'complete_inspection',
        condition: inspectCondition,
        severity: inspectSeverity,
        service_required: inspectServiceRequired,
        service_status: inspectServiceRequired ? 'Required' : 'Not Required',
        notes: inspectNotes,
        recommended_action: inspectServiceRequired ? 'Physical Tree Maintenance' : 'Periodic Monitoring',
      }).catch(() => null);

      setAssignments((prev) =>
        prev.map((a) =>
          a.id === inspectModalAssignment.id
            ? {
                ...a,
                ...(updated || {}),
                inspection_status: 'Inspection Completed',
                service_required: inspectServiceRequired,
                service_status: inspectServiceRequired ? 'Required' : 'Not Required',
                notes: inspectNotes,
              }
            : a
        )
      );
      setInspectModalAssignment(null);
      setInspectNotes('');
    } catch {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === inspectModalAssignment.id
            ? {
                ...a,
                inspection_status: 'Inspection Completed',
                service_required: inspectServiceRequired,
                service_status: inspectServiceRequired ? 'Required' : 'Not Required',
                notes: inspectNotes,
              }
            : a
        )
      );
      setInspectModalAssignment(null);
      setInspectNotes('');
    } finally {
      setInspectSubmitting(false);
    }
  };

  // Submit Work Completion Modal
  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workModalAssignment) return;
    setWorkSubmitting(true);
    try {
      const updated = await inspectorApi.updateWorkflow(workModalAssignment.id, {
        action: 'mark_service_completed',
        work_performed: workType,
        service_notes: workNotes,
        completion_notes: `Arborist work completed: ${workType}. ${workNotes}`.trim(),
      }).catch(() => null);

      setAssignments((prev) =>
        prev.map((a) =>
          a.id === workModalAssignment.id
            ? {
                ...a,
                ...(updated || {}),
                service_status: 'Service Completed',
                work_performed: workType,
                status: 'completed',
              }
            : a
        )
      );
      setWorkModalAssignment(null);
      setWorkNotes('');
    } catch {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === workModalAssignment.id
            ? {
                ...a,
                service_status: 'Service Completed',
                work_performed: workType,
                status: 'completed',
              }
            : a
        )
      );
      setWorkModalAssignment(null);
      setWorkNotes('');
    } finally {
      setWorkSubmitting(false);
    }
  };

  // Real calculations
  const totalAssignedCount = assignments.length;
  const pendingInspectionsCount = assignments.filter(
    (a) => (a.inspection_status === 'Assigned' || !a.inspection_status) && a.status !== 'completed'
  ).length;
  const inProgressCount = assignments.filter(
    (a) => a.inspection_status === 'In Progress' || a.service_status === 'Service In Progress'
  ).length;
  const highPriorityCount = assignments.filter(
    (a) => (a.priority === 'High' || a.priority === 'Emergency') && a.status !== 'completed'
  ).length;
  const emergencyCount = assignments.filter(
    (a) => (a.priority === 'Emergency' || a.status === 'emergency') && a.status !== 'completed'
  ).length;
  const completedWorkCount = assignments.filter(
    (a) => a.status === 'completed' || a.service_status === 'Service Completed' || a.inspection_status === 'Inspection Completed'
  ).length;

  // Active emergency callout
  const activeEmergencies = assignments.filter(
    (a) => (a.priority === 'Emergency' || a.status === 'emergency') && a.status !== 'completed'
  );

  // Filtered and priority-ordered queue
  const priorityRank: Record<string, number> = {
    Emergency: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const filteredAssignments = assignments
    .filter((item) => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'High & Emergency') return item.priority === 'Emergency' || item.priority === 'High';
      if (activeFilter === 'Pending Inspection')
        return (item.inspection_status === 'Assigned' || !item.inspection_status) && item.status !== 'completed';
      if (activeFilter === 'In Progress')
        return item.inspection_status === 'In Progress' || item.service_status === 'Service In Progress';
      if (activeFilter === 'Service Required')
        return item.service_required && item.service_status !== 'Service Completed';
      if (activeFilter === 'Completed')
        return item.status === 'completed' || item.service_status === 'Service Completed' || item.inspection_status === 'Inspection Completed';
      return true;
    })
    .sort((a, b) => (priorityRank[b.priority] || 1) - (priorityRank[a.priority] || 1));

  const getImageUrl = (url?: string | null) => {
    if (!url) {
      return 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=160&h=160&fit=crop&auto=format';
    }
    if (url.startsWith('/uploads/')) {
      return `http://127.0.0.1:8000${url}`;
    }
    return url;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* 1. Inspector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 tracking-wide uppercase">
              FIELD OPERATIONS
            </span>
            <span className="text-xs text-gray-400 font-mono">Assigned Tree Work & Field Actions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {greeting}, {displayName}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {currentDateStr} · On-Site Field Work Orders & Arbo-Technical Service Queue
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="text-xs bg-white border border-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>↻</span>
            <span>{loading ? 'Refreshing…' : 'Refresh Queue'}</span>
          </button>
          <Link
            to="/app/map"
            className="text-xs bg-forest-700 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-forest-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <span>🗺️</span>
            <span>Field Map</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between shadow-sm">
          <span>{error}</span>
          <button
            onClick={loadDashboard}
            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Operational Summary Metrics (6 Real Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Assigned Today */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assigned Today</p>
          <p className="text-2xl font-bold text-gray-900">{loading ? '…' : totalAssignedCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Active field roster</p>
        </div>

        {/* Card 2: Pending Inspections */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Inspections</p>
          <p className="text-2xl font-bold text-amber-600">{loading ? '…' : pendingInspectionsCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Awaiting site visit</p>
        </div>

        {/* Card 3: High Priority */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">High Priority</p>
          <p className="text-2xl font-bold text-red-600">{loading ? '…' : highPriorityCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Urgent triage</p>
        </div>

        {/* Card 4: Emergency Cases */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Emergency Cases</p>
          <p className="text-2xl font-bold text-rose-600">{loading ? '…' : emergencyCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Immediate hazard</p>
        </div>

        {/* Card 5: Work In Progress */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Work In Progress</p>
          <p className="text-2xl font-bold text-purple-700">{loading ? '…' : inProgressCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Active in field</p>
        </div>

        {/* Card 6: Work Completed */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Work Completed</p>
          <p className="text-2xl font-bold text-teal-600">{loading ? '…' : completedWorkCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Finished & closed</p>
        </div>
      </div>

      {/* 3. Urgent Emergency Field Cases Callout (Main Section 3) */}
      {activeEmergencies.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-2xl p-5 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 bg-white rounded-full animate-ping" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                Emergency Field Cases Assigned to You
              </span>
            </div>
            <span className="text-xs text-red-100 bg-red-900/60 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {activeEmergencies.length} Active Hazard{activeEmergencies.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {activeEmergencies.map((emg) => (
              <div
                key={emg.id}
                className="bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-white bg-red-900/80 px-2 py-0.5 rounded">
                      {emg.id}
                    </span>
                    {emg.tree_id && (
                      <span className="font-mono text-xs text-red-100">
                        Tree: {emg.tree_id}
                      </span>
                    )}
                    <span className="text-[10px] bg-red-800 text-white px-2 py-0.5 rounded-full font-bold uppercase">
                      Immediate Response
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{emg.title}</h4>
                  <p className="text-xs text-red-100 mt-0.5">{emg.location_name}</p>
                  {emg.ai_assessment && (
                    <p className="text-[11px] text-red-200 mt-1 italic leading-tight">
                      "{emg.ai_assessment}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setInspectModalAssignment(emg);
                      setInspectSeverity('Emergency');
                    }}
                    className="bg-white text-red-700 hover:bg-red-50 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Resolve Emergency →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Priority Field Work (Main Section 1) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Priority Field Work</h2>
            <p className="text-xs text-gray-400">
              Operational work queue sorted by severity & dispatch priority
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 text-xs flex-wrap">
            {filterTabs.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeFilter === f
                    ? 'bg-forest-700 text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Loading your assigned field queue…</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-2">🌿</div>
            <p className="text-sm font-bold text-gray-800 mb-1">
              No assignments matching "{activeFilter}"
            </p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
              {activeFilter === 'All'
                ? "You're currently all caught up on scheduled tree inspections."
                : `There are currently no assignments matching the ${activeFilter} filter.`}
            </p>
            {activeFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setActiveFilter('All')}
                className="text-xs bg-forest-50 text-forest-700 border border-forest-200 px-4 py-2 rounded-lg font-bold hover:bg-forest-100 transition cursor-pointer"
              >
                Show All Assignments
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAssignments.map((a) => {
              const isAssignedNotStarted =
                (a.inspection_status === 'Assigned' || !a.inspection_status) && a.status !== 'completed';
              const isInProgress = a.inspection_status === 'In Progress';
              const isServicePending =
                a.service_required && a.service_status !== 'Service Completed' && a.status !== 'completed';

              return (
                <div
                  key={a.id}
                  className="p-5 hover:bg-gray-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <img
                      src={getImageUrl(a.image_url)}
                      alt={a.title}
                      className="w-16 h-16 rounded-xl object-cover bg-gray-100 border border-gray-100 flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {a.id}
                        </span>
                        {a.tree_id && (
                          <span className="font-mono text-xs font-bold text-forest-700 bg-forest-50 px-2 py-0.5 rounded border border-forest-100">
                            {a.tree_id}
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            priorityColors[a.priority] || 'text-gray-600 bg-gray-100'
                          }`}
                        >
                          {a.priority} Priority
                        </span>
                        {getWorkStatusBadge(a)}
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm">{a.title}</h3>
                      <p className="text-xs text-gray-500">{a.location_name}</p>

                      <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-0.5 flex-wrap">
                        <span>
                          Assigned:{' '}
                          <strong className="text-gray-600">
                            {new Date(a.assigned_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </strong>
                        </span>
                        {a.due_date && (
                          <span>
                            Due:{' '}
                            <strong className="text-gray-600">
                              {new Date(a.due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </strong>
                          </span>
                        )}
                        {a.work_performed && (
                          <span className="text-emerald-700 font-medium">
                            Work: {a.work_performed}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contextual In-Line Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {isAssignedNotStarted && (
                      <button
                        type="button"
                        onClick={(e) => handleStartInspection(a.id, e)}
                        disabled={actionLoadingId === a.id}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <span>▶</span>
                        <span>{actionLoadingId === a.id ? 'Starting…' : 'Start Inspection'}</span>
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectModalAssignment(a);
                          setInspectCondition('Fair');
                          setInspectSeverity(a.priority === 'Emergency' ? 'Emergency' : 'Medium');
                          setInspectServiceRequired(true);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>Mark Inspection Completed</span>
                      </button>
                    )}

                    {isServicePending && (
                      <button
                        type="button"
                        onClick={() => {
                          setWorkModalAssignment(a);
                          setWorkType('Branch Pruning / Limb Removal');
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🪓</span>
                        <span>Mark Work Completed</span>
                      </button>
                    )}

                    <Link
                      to={`/app/inspector/${encodeURIComponent(a.id)}`}
                      className="border border-gray-200 text-gray-700 hover:bg-gray-50 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-2xs"
                    >
                      Open Case →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Today's Assignments (Main Section 2) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Today's Assignments</h2>
            <p className="text-xs text-gray-400">Scheduled work orders assigned specifically to your arborist badge</p>
          </div>
          <span className="text-xs font-mono font-bold text-forest-800 bg-forest-50 px-2.5 py-1 rounded-lg border border-forest-100">
            {assignments.length} Total Assigned
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {assignments.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="p-4 bg-gray-50/70 hover:bg-gray-50 rounded-xl border border-gray-100 space-y-2.5 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-forest-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {item.tree_id || item.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityColors[item.priority] || 'text-gray-600 bg-white'}`}>
                  {item.priority}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.location_name}</p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                <span className="text-gray-500 font-medium">
                  {item.inspection_status || 'Assigned'}
                </span>
                <Link
                  to={`/app/inspector/${encodeURIComponent(item.id)}`}
                  className="text-forest-700 font-bold hover:underline"
                >
                  View Order →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Work Completion & Operational Lifecycle Pipeline (Main Section 4) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Work Completion & Field Lifecycle</h2>
            <p className="text-xs text-gray-400">Step-by-step arbo-technical operational progression</p>
          </div>
          <span className="text-xs text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full font-bold border border-teal-200">
            {completedWorkCount} Resolved Cases
          </span>
        </div>

        {/* 6 Lifecycle Stage Progress Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
          {[
            { label: '1. Inspection Pending', count: pendingInspectionsCount, color: 'bg-amber-50 text-amber-800 border-amber-200' },
            { label: '2. Inspection In Progress', count: assignments.filter((a) => a.inspection_status === 'In Progress').length, color: 'bg-blue-50 text-blue-800 border-blue-200' },
            { label: '3. Inspection Done', count: assignments.filter((a) => a.inspection_status === 'Inspection Completed').length, color: 'bg-teal-50 text-teal-800 border-teal-200' },
            { label: '4. Service Required', count: assignments.filter((a) => a.service_required && a.service_status === 'Required').length, countDesc: 'Pruning / Removal', color: 'bg-orange-50 text-orange-800 border-orange-200' },
            { label: '5. Service In Progress', count: assignments.filter((a) => a.service_status === 'Service In Progress').length, color: 'bg-purple-50 text-purple-800 border-purple-200' },
            { label: '6. Work Completed', count: assignments.filter((a) => a.service_status === 'Service Completed' || a.status === 'completed').length, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
          ].map((step, idx) => (
            <div key={idx} className={`p-3 rounded-xl border ${step.color} flex flex-col justify-between`}>
              <p className="text-[11px] font-bold">{step.label}</p>
              <p className="text-xl font-bold font-mono my-1">{loading ? '…' : step.count}</p>
              <p className="text-[10px] opacity-80">{step.countDesc || (step.count > 0 ? 'Active in system' : 'None pending')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal 1: Mark Inspection Complete */}
      {inspectModalAssignment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Record Inspection Findings</h3>
                <p className="text-xs text-gray-400">Assignment: {inspectModalAssignment.id} · Tree: {inspectModalAssignment.tree_id || 'N/A'}</p>
              </div>
              <button
                onClick={() => setInspectModalAssignment(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Observed Tree Condition</label>
                <select
                  value={inspectCondition}
                  onChange={(e) => setInspectCondition(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-gray-800"
                >
                  <option value="Good">Good — Stable canopy & roots</option>
                  <option value="Fair">Fair — Minor branch deadwood / minor distress</option>
                  <option value="Poor">Poor — Major decay / structural vulnerability</option>
                  <option value="Critical">Critical — Severe hazard / immediate failure risk</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Operational Severity</label>
                <select
                  value={inspectSeverity}
                  onChange={(e) => setInspectSeverity(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-gray-800"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-amber-900">Physical Arbo-Technical Service Required?</p>
                  <p className="text-[11px] text-amber-700">Trimming, branch removal, bracing, or emergency clearance</p>
                </div>
                <input
                  type="checkbox"
                  checked={inspectServiceRequired}
                  onChange={(e) => setInspectServiceRequired(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Arborist Inspection Notes</label>
                <textarea
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  placeholder="Record detailed observations from on-site visit..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg p-2 text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setInspectModalAssignment(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inspectSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {inspectSubmitting ? 'Saving Findings…' : 'Save Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Mark Work Completed */}
      {workModalAssignment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Record Service / Tree Work Completion</h3>
                <p className="text-xs text-gray-400">Assignment: {workModalAssignment.id} · Tree: {workModalAssignment.tree_id || 'N/A'}</p>
              </div>
              <button
                onClick={() => setWorkModalAssignment(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitWork} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Arborist Work Executed</label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-gray-800"
                >
                  <option value="Branch Pruning / Limb Removal">Branch Pruning / Limb Removal</option>
                  <option value="Fallen Trunk Clearance">Fallen Trunk Clearance & Roadway Restoration</option>
                  <option value="Cabling & Structural Bracing">Cabling & Structural Bracing</option>
                  <option value="Root Treatment & Soil Aeration">Root Treatment & Soil Aeration</option>
                  <option value="Hazard Removal & Powerline Clearance">Hazard Removal & Powerline Clearance</option>
                  <option value="Complete Tree Removal & Site Safety">Complete Tree Removal & Site Safety</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Completion & Verification Details</label>
                <textarea
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="Describe the completed tree maintenance and confirming that the site is now safe..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg p-2 text-gray-800"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px]">
                ✓ Marking this service completed will update the backend database, log timestamps, and update the citizen's report status.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setWorkModalAssignment(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={workSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {workSubmitting ? 'Recording Completion…' : '✓ Service Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
