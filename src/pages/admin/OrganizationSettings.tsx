import { useState, useEffect } from 'react';
import { adminApi, OrganizationSettingsResponse } from '../../services/admin';

export default function OrganizationSettings() {
  const [settings, setSettings] = useState<OrganizationSettingsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Form Fields
  const [orgName, setOrgName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [slaHours, setSlaHours] = useState(4.0);
  const [autoAssign, setAutoAssign] = useState(true);
  const [dispatchEmail, setDispatchEmail] = useState('');
  const [primaryContact, setPrimaryContact] = useState('');

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setError(null);
      try {
        const data = await adminApi.getSettings();
        setSettings(data);
        setOrgName(data.organization_name || '');
        setJurisdiction(data.jurisdiction || '');
        setSlaHours(data.emergency_sla_hours || 4.0);
        setAutoAssign(data.auto_assignment_enabled ?? true);
        setDispatchEmail(data.dispatch_email || '');
        setPrimaryContact(data.primary_contact || '');
      } catch (err: any) {
        setError(err?.message || 'Failed to load organization settings.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setError(null);
    try {
      const updated = await adminApi.updateSettings({
        organization_name: orgName,
        jurisdiction,
        emergency_sla_hours: Number(slaHours),
        auto_assignment_enabled: autoAssign,
        dispatch_email: dispatchEmail,
        primary_contact: primaryContact,
      });
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-gray-400 text-sm animate-pulse">
        Loading organization settings...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 font-display">Organization Settings</h1>
        <p className="text-gray-500 text-sm">Configure municipal jurisdiction boundaries, emergency response SLAs, and automated triage policies</p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl font-medium flex items-center gap-2">
          <span>✓</span> Organization settings successfully saved and applied across dispatch systems.
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Details */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Organization Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Organization / Division Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Municipal Jurisdiction</label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Operational SLA Settings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Emergency Response & SLAs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Emergency SLA Response Target (Hours)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="48"
                value={slaHours}
                onChange={(e) => setSlaHours(parseFloat(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500"
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">Maximum elapsed time from submission to on-site inspector arrival.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">AI Triage Model</label>
              <input
                type="text"
                disabled
                value={settings?.triage_model || 'TreeGuard Vision AI v2.4'}
                className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3.5 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-gray-50">
            <div>
              <p className="font-semibold text-sm text-gray-900">Automated Dispatch Assignment</p>
              <p className="text-xs text-gray-500">Automatically assign nearest active field inspector upon high-severity detection.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-600"></div>
            </label>
          </div>
        </div>

        {/* Dispatch & Communications */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Emergency Contact Channels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Dispatch Operations Email</label>
              <input
                type="email"
                value={dispatchEmail}
                onChange={(e) => setDispatchEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Field Command Phone Hotline</label>
              <input
                type="text"
                value={primaryContact}
                onChange={(e) => setPrimaryContact(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-forest-800 text-white rounded-lg text-sm font-semibold hover:bg-forest-900 transition disabled:opacity-60 cursor-pointer shadow-sm"
          >
            {saving ? 'Saving Settings…' : 'Save Organization Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
