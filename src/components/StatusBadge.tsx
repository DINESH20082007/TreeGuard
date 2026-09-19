export type Status =
  | 'healthy'
  | 'monitoring'
  | 'at-risk'
  | 'emergency'
  | 'pending'
  | 'under-review'
  | 'assigned'
  | 'in-progress'
  | 'inspection-in-progress'
  | 'inspection-completed'
  | 'service-required'
  | 'service-in-progress'
  | 'service-completed'
  | 'follow-up-required'
  | 'completed'
  | 'resolved'
  | 'rejected'
  | 'critical'
  | string;

const configs: Record<string, { label: string; classes: string }> = {
  healthy: { label: 'Healthy', classes: 'bg-green-100 text-green-700' },
  monitoring: { label: 'Monitoring', classes: 'bg-yellow-100 text-yellow-700' },
  'at-risk': { label: 'At Risk', classes: 'bg-orange-100 text-orange-700' },
  emergency: { label: 'Emergency', classes: 'bg-red-100 text-red-700' },
  critical: { label: 'Critical', classes: 'bg-red-100 text-red-700' },
  pending: { label: 'Pending Review', classes: 'bg-amber-100 text-amber-800' },
  'under-review': { label: 'Under Review', classes: 'bg-blue-100 text-blue-700' },
  assigned: { label: 'Inspector Assigned', classes: 'bg-purple-100 text-purple-700' },
  'in-progress': { label: 'In Progress', classes: 'bg-sky-100 text-sky-800' },
  'inspection-in-progress': { label: 'Inspection In Progress', classes: 'bg-sky-100 text-sky-800' },
  'inspection-completed': { label: 'Inspection Completed', classes: 'bg-teal-100 text-teal-800' },
  'service-required': { label: 'Service Required', classes: 'bg-amber-100 text-amber-800' },
  'service-in-progress': { label: 'Service In Progress', classes: 'bg-indigo-100 text-indigo-800' },
  'service-completed': { label: 'Service Completed', classes: 'bg-emerald-100 text-emerald-800' },
  'follow-up-required': { label: 'Follow-up Required', classes: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-700' },
  resolved: { label: 'Resolved', classes: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-600' },
};

const dotColors: Record<string, string> = {
  healthy: 'bg-green-500',
  monitoring: 'bg-yellow-500',
  'at-risk': 'bg-orange-500',
  emergency: 'bg-red-500',
  critical: 'bg-red-500',
  pending: 'bg-amber-500',
  'under-review': 'bg-blue-500',
  assigned: 'bg-purple-500',
  'in-progress': 'bg-sky-500',
  'inspection-in-progress': 'bg-sky-500',
  'inspection-completed': 'bg-teal-500',
  'service-required': 'bg-amber-500',
  'service-in-progress': 'bg-indigo-500',
  'service-completed': 'bg-emerald-500',
  'follow-up-required': 'bg-purple-500',
  completed: 'bg-green-500',
  resolved: 'bg-emerald-500',
  rejected: 'bg-red-500',
};

interface StatusBadgeProps {
  status: Status;
  dot?: boolean;
}

export default function StatusBadge({ status, dot = false }: StatusBadgeProps) {
  if (!status) return null;
  const normStatus = status.toLowerCase();
  const cfg = configs[normStatus] ?? {
    label: status.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    classes: 'bg-gray-100 text-gray-700',
  };
  const dotColor = dotColors[normStatus] || 'bg-gray-400';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.classes}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {cfg.label}
    </span>
  );
}
