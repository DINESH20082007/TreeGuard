import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi, UserNotificationPreferences, UserPrivacySettings } from '../../services/auth';

type Section = 'personal' | 'notifications' | 'security' | 'privacy';

const sections: { value: Section; label: string; icon: string }[] = [
  { value: 'personal', label: 'Personal information', icon: '👤' },
  { value: 'notifications', label: 'Notification preferences', icon: '🔔' },
  { value: 'security', label: 'Security', icon: '🔒' },
  { value: 'privacy', label: 'Privacy', icon: '🛡' },
];

const DEFAULT_NOTIF_PREFS: UserNotificationPreferences = {
  emergencyNearby: true,
  reportUpdates: true,
  treeAlerts: true,
  weeklyDigest: false,
  inspectionCompleted: true,
};

const DEFAULT_PRIVACY_SETTINGS: UserPrivacySettings = {
  locationAccess: true,
  anonymousReporting: false,
  dataUsageForAI: true,
};

export default function Profile() {
  const { user, updateProfile, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('personal');
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  // Personal Info Form State
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [primaryDistrict, setPrimaryDistrict] = useState<string>('RS Puram, Coimbatore');
  const [isSavingPersonal, setIsSavingPersonal] = useState<boolean>(false);
  const [personalSuccessMsg, setPersonalSuccessMsg] = useState<string | null>(null);
  const [personalErrorMsg, setPersonalErrorMsg] = useState<string | null>(null);

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<UserNotificationPreferences>(DEFAULT_NOTIF_PREFS);
  const [isSavingNotifs, setIsSavingNotifs] = useState<boolean>(false);
  const [notifSuccessMsg, setNotifSuccessMsg] = useState<string | null>(null);
  const [notifErrorMsg, setNotifErrorMsg] = useState<string | null>(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSavingPassword, setIsSavingPassword] = useState<boolean>(false);
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState<string | null>(null);
  const [securityErrorMsg, setSecurityErrorMsg] = useState<string | null>(null);

  // Privacy State
  const [privacySettings, setPrivacySettings] = useState<UserPrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState<boolean>(false);
  const [privacySuccessMsg, setPrivacySuccessMsg] = useState<string | null>(null);
  const [privacyErrorMsg, setPrivacyErrorMsg] = useState<string | null>(null);

  // Load fresh profile from PostgreSQL
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const profile = await authApi.getProfile();
        if (isMounted && profile) {
          setFullName(profile.full_name || '');
          setPhoneNumber(profile.phone_number || '');
          setPrimaryDistrict(profile.primary_district || 'RS Puram, Coimbatore');
          if (profile.notification_preferences) {
            setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...profile.notification_preferences });
          }
          if (profile.privacy_settings) {
            setPrivacySettings({ ...DEFAULT_PRIVACY_SETTINGS, ...profile.privacy_settings });
          }
        }
      } catch (err: any) {
        if (isMounted && user) {
          setFullName(user.full_name || '');
          setPhoneNumber(user.phone_number || '');
          setPrimaryDistrict(user.primary_district || 'RS Puram, Coimbatore');
          if (user.notification_preferences) {
            setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...user.notification_preferences });
          }
          if (user.privacy_settings) {
            setPrivacySettings({ ...DEFAULT_PRIVACY_SETTINGS, ...user.privacy_settings });
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSavePersonalInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPersonalErrorMsg(null);
    setPersonalSuccessMsg(null);

    if (!fullName.trim()) {
      setPersonalErrorMsg('Full name cannot be blank.');
      return;
    }

    try {
      setIsSavingPersonal(true);
      await updateProfile({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || undefined,
        primary_district: primaryDistrict.trim() || undefined,
      });
      setPersonalSuccessMsg('Personal information updated successfully.');
      setTimeout(() => setPersonalSuccessMsg(null), 4000);
    } catch (err: any) {
      setPersonalErrorMsg(err.message || 'Failed to update personal information.');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleCancelPersonal = () => {
    setPersonalErrorMsg(null);
    setPersonalSuccessMsg(null);
    if (user) {
      setFullName(user.full_name || '');
      setPhoneNumber(user.phone_number || '');
      setPrimaryDistrict(user.primary_district || 'RS Puram, Coimbatore');
    }
  };

  const handleToggleNotif = async (key: keyof UserNotificationPreferences) => {
    const updated = {
      ...notifPrefs,
      [key]: !notifPrefs[key],
    };
    setNotifPrefs(updated);
    setNotifErrorMsg(null);
    setNotifSuccessMsg(null);

    try {
      setIsSavingNotifs(true);
      await updateProfile({
        notification_preferences: updated,
      });
      setNotifSuccessMsg('Notification preferences updated.');
      setTimeout(() => setNotifSuccessMsg(null), 3000);
    } catch (err: any) {
      setNotifErrorMsg(err.message || 'Failed to update notification preferences.');
      // Revert local state
      setNotifPrefs(notifPrefs);
    } finally {
      setIsSavingNotifs(false);
    }
  };

  const handleTogglePrivacy = async (key: keyof UserPrivacySettings) => {
    const updated = {
      ...privacySettings,
      [key]: !privacySettings[key],
    };
    setPrivacySettings(updated);
    setPrivacyErrorMsg(null);
    setPrivacySuccessMsg(null);

    try {
      setIsSavingPrivacy(true);
      await updateProfile({
        privacy_settings: updated,
      });
      setPrivacySuccessMsg('Privacy settings updated.');
      setTimeout(() => setPrivacySuccessMsg(null), 3000);
    } catch (err: any) {
      setPrivacyErrorMsg(err.message || 'Failed to update privacy settings.');
      // Revert local state
      setPrivacySettings(privacySettings);
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityErrorMsg(null);
    setSecuritySuccessMsg(null);

    if (!currentPassword) {
      setSecurityErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setSecurityErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityErrorMsg('New password and confirmation do not match.');
      return;
    }

    try {
      setIsSavingPassword(true);
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSecuritySuccessMsg(res.message || 'Password successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSecuritySuccessMsg(null), 4000);
    } catch (err: any) {
      setSecurityErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const displayName = user?.full_name || fullName || 'User';
  const displayEmail = user?.email || 'user@example.com';
  const displayRole = user?.role
    ? user.role === 'inspector'
      ? 'Field Inspector'
      : user.role === 'admin'
      ? 'Administrator'
      : 'Citizen'
    : 'Citizen';
  const displayInitial = (displayName && displayName[0]?.toUpperCase()) || 'U';
  const memberSince = user?.member_since || (user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'March 2024');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Profile & Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your authenticated account, personal details, and preferences</p>
        </div>
        {isLoadingProfile && (
          <span className="text-xs text-forest-600 bg-forest-50 px-2.5 py-1 rounded-full animate-pulse self-start">
            Syncing profile...
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Avatar Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-forest-700 text-white text-2xl font-semibold flex items-center justify-center mx-auto mb-3 shadow-inner">
              {displayInitial}
            </div>
            <p className="font-semibold text-gray-900 truncate">{displayName}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-forest-50 text-forest-700 border border-forest-100">
              {displayRole}
            </span>
            <p className="text-xs text-gray-400 mt-2 truncate">{displayEmail}</p>
          </div>

          {/* Navigation */}
          <nav className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {sections.map((s) => (
              <button
                key={s.value}
                onClick={() => setActiveSection(s.value)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 text-sm transition-colors ${
                  activeSection === s.value ? 'bg-forest-50 text-forest-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 font-normal'
                }`}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeSection === 'personal' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-gray-900">Personal Information</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Your identity and contact details saved in TreeGuard</p>
                </div>
              </div>

              {personalSuccessMsg && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
                  <span>✓</span>
                  <span>{personalSuccessMsg}</span>
                </div>
              )}

              {personalErrorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{personalErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSavePersonalInfo}>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Jane Doe"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Email Address (Read-only) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-500">Email address</label>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Fixed</span>
                    </div>
                    <input
                      type="email"
                      value={displayEmail}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm text-gray-500 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +1 (415) 555-0192"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Account Type (Read-only) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-500">Account type</label>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Role</span>
                    </div>
                    <input
                      type="text"
                      value={displayRole}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm text-gray-500 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Member Since (Read-only) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-500">Member since</label>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Created</span>
                    </div>
                    <input
                      type="text"
                      value={memberSince}
                      readOnly
                      disabled
                      className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm text-gray-500 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Primary District */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Primary district</label>
                    <select
                      value={primaryDistrict}
                      onChange={(e) => setPrimaryDistrict(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="RS Puram, Coimbatore">RS Puram</option>
                      <option value="Gandhipuram, Coimbatore">Gandhipuram</option>
                      <option value="Saibaba Colony, Coimbatore">Saibaba Colony</option>
                      <option value="Race Course, Coimbatore">Race Course</option>
                      <option value="Peelamedu, Coimbatore">Peelamedu</option>
                      <option value="Singanallur, Coimbatore">Singanallur</option>
                      <option value="Saravanampatti, Coimbatore">Saravanampatti</option>
                      <option value="Vadavalli, Coimbatore">Vadavalli</option>
                      <option value="Kalapatti, Coimbatore">Kalapatti</option>
                      <option value="Kuniyamuthur, Coimbatore">Kuniyamuthur</option>
                      <option value="Kovaipudur, Coimbatore">Kovaipudur</option>
                      <option value="Thudiyalur, Coimbatore">Thudiyalur</option>
                      <option value="Sulur, Coimbatore">Sulur</option>
                      <option value="Ukkadam, Coimbatore">Ukkadam</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSavingPersonal}
                    className="text-sm bg-forest-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                  >
                    {isSavingPersonal ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving changes...
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPersonal}
                    disabled={isSavingPersonal}
                    className="text-sm border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Control which email and system alerts you receive</p>
                </div>
                {isSavingNotifs && (
                  <span className="text-xs text-forest-600 flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-forest-600 border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                )}
              </div>

              {notifSuccessMsg && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
                  <span>✓</span>
                  <span>{notifSuccessMsg}</span>
                </div>
              )}

              {notifErrorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{notifErrorMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                {[
                  {
                    key: 'emergencyNearby' as const,
                    label: 'Emergency alerts nearby',
                    desc: 'Get notified when an emergency hazard is reported within 500m of your location',
                  },
                  {
                    key: 'reportUpdates' as const,
                    label: 'Report status updates',
                    desc: 'Real-time notifications when your tree reports are reviewed, scheduled, or resolved',
                  },
                  {
                    key: 'treeAlerts' as const,
                    label: 'Tree health alerts',
                    desc: 'Alerts when monitored trees in your district change health condition or risk grade',
                  },
                  {
                    key: 'inspectionCompleted' as const,
                    label: 'Inspection completed',
                    desc: 'Notify when a certified Field Inspector submits an assessment report',
                  },
                  {
                    key: 'weeklyDigest' as const,
                    label: 'Weekly digest',
                    desc: 'Weekly summary of canopy health, planting events, and urban forestry stats',
                  },
                ].map((pref) => {
                  const isChecked = !!notifPrefs[pref.key];
                  return (
                    <div key={pref.key} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
                      <div className="pr-4">
                        <p className="text-sm font-medium text-gray-800">{pref.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{pref.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleNotif(pref.key)}
                        disabled={isSavingNotifs}
                        aria-label={pref.label}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest-500 focus:ring-offset-1 ${
                          isChecked ? 'bg-forest-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            isChecked ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Security & Password</h2>
              <p className="text-xs text-gray-500 mb-5">Change your account password securely</p>

              {securitySuccessMsg && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
                  <span>✓</span>
                  <span>{securitySuccessMsg}</span>
                </div>
              )}

              {securityErrorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{securityErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">New password (min. 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter a new secure password"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm new password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="text-sm bg-forest-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-forest-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                  >
                    {isSavingPassword ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      'Update password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-gray-900">Privacy Settings</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Control how your location and report telemetry are shared</p>
                </div>
                {isSavingPrivacy && (
                  <span className="text-xs text-forest-600 flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-forest-600 border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                )}
              </div>

              {privacySuccessMsg && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
                  <span>✓</span>
                  <span>{privacySuccessMsg}</span>
                </div>
              )}

              {privacyErrorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{privacyErrorMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                {[
                  {
                    key: 'locationAccess' as const,
                    label: 'Location access',
                    desc: 'Allow TreeGuard to use your GPS location when submitting and tracking urban trees',
                  },
                  {
                    key: 'anonymousReporting' as const,
                    label: 'Anonymous reporting',
                    desc: 'Submit public reports without publishing your citizen name on public maps',
                  },
                  {
                    key: 'dataUsageForAI' as const,
                    label: 'Data usage for AI improvement',
                    desc: 'Allow submitted canopy photos to improve health diagnosis models (anonymized)',
                  },
                ].map((item) => {
                  const isOn = !!privacySettings[item.key];
                  return (
                    <div key={item.key} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
                      <div className="pr-4">
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePrivacy(item.key)}
                        disabled={isSavingPrivacy}
                        aria-label={item.label}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest-500 focus:ring-offset-1 ${
                          isOn ? 'bg-forest-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            isOn ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
