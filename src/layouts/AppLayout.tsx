import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../services/notifications';

type Workspace = 'citizen' | 'inspector' | 'admin';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

// 1. Citizen Sidebar Navigation (6 items)
const citizenNav: NavItem[] = [
  { label: 'Dashboard', href: '/app/citizen', icon: '⬡' },
  { label: 'Tree Map', href: '/app/map', icon: '◎' },
  { label: 'Report a Tree', href: '/app/report', icon: '+' },
  { label: 'My Reports', href: '/app/reports', icon: '≡' },
  { label: 'Emergency', href: '/app/emergency', icon: '!' },
  { label: 'Notifications', href: '/app/notifications', icon: '◉' },
];

// 2. Field Inspector Sidebar Navigation (7 items)
const inspectorNav: NavItem[] = [
  { label: 'Dashboard', href: '/app/inspector', icon: '⬡' },
  { label: 'Assignments', href: '/app/inspector/assignments', icon: '📋' },
  { label: 'Field Inspections', href: '/app/inspector/inspections', icon: '🔍' },
  { label: 'Emergency Cases', href: '/app/inspector/emergency', icon: '🚨' },
  { label: 'Tree Map', href: '/app/map', icon: '◎' },
  { label: 'Reports', href: '/app/reports', icon: '≡' },
  { label: 'Notifications', href: '/app/notifications', icon: '◉' },
];

// 3. Organization Admin Sidebar Navigation (8 items)
const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/app/admin', icon: '⬡' },
  { label: 'Emergency Operations', href: '/app/admin/emergency', icon: '🚨' },
  { label: 'Analytics', href: '/app/admin/analytics', icon: '∿' },
  { label: 'Monitoring', href: '/app/admin/monitoring', icon: '◈' },
  { label: 'Reports', href: '/app/reports', icon: '≡' },
  { label: 'User Management', href: '/app/admin/users', icon: '👥' },
  { label: 'Organization Settings', href: '/app/admin/settings', icon: '⚙' },
  { label: 'Notifications', href: '/app/notifications', icon: '◉' },
];

const workspaces: { id: Workspace; label: string; href: string }[] = [
  { id: 'citizen', label: 'Citizen', href: '/app/citizen' },
  { id: 'inspector', label: 'Field Inspector', href: '/app/inspector' },
  { id: 'admin', label: 'Organization Admin', href: '/app/admin' },
];

export default function AppLayout() {
  const { user, role, canAccessAllDashboards, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const loc = useLocation();
  const navigate = useNavigate();

  // Track active operational workspace with sessionStorage persistence for presentation client
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace>(() => {
    const saved = sessionStorage.getItem('treeguard_active_workspace') as Workspace | null;
    if (saved && (saved === 'citizen' || saved === 'inspector' || saved === 'admin')) {
      return saved;
    }
    if (loc.pathname.startsWith('/app/inspector')) return 'inspector';
    if (loc.pathname.startsWith('/app/admin')) return 'admin';
    if (role === 'admin') return 'admin';
    if (role === 'inspector') return 'inspector';
    return 'citizen';
  });

  // Sync workspace with current URL route
  useEffect(() => {
    if (loc.pathname.startsWith('/app/inspector')) {
      setSelectedWorkspace('inspector');
      sessionStorage.setItem('treeguard_active_workspace', 'inspector');
    } else if (loc.pathname.startsWith('/app/admin')) {
      setSelectedWorkspace('admin');
      sessionStorage.setItem('treeguard_active_workspace', 'admin');
    } else if (
      loc.pathname === '/app/citizen' ||
      loc.pathname === '/app/report' ||
      loc.pathname === '/app/emergency'
    ) {
      setSelectedWorkspace('citizen');
      sessionStorage.setItem('treeguard_active_workspace', 'citizen');
    }
  }, [loc.pathname]);

  // Fetch real unread notification count
  useEffect(() => {
    let mounted = true;
    async function checkUnread() {
      try {
        const res = await notificationsApi.getUnreadCount();
        if (mounted) setUnreadCount(res.unread_count || 0);
      } catch {
        // Silently ignore if unauthenticated
      }
    }
    checkUnread();
    return () => {
      mounted = false;
    };
  }, [loc.pathname, user]);

  const activeWorkspace: Workspace = canAccessAllDashboards
    ? selectedWorkspace
    : role === 'admin'
    ? 'admin'
    : role === 'inspector'
    ? 'inspector'
    : 'citizen';

  const nav = activeWorkspace === 'citizen' ? citizenNav : activeWorkspace === 'inspector' ? inspectorNav : adminNav;

  const handleWorkspaceSelect = (w: (typeof workspaces)[0]) => {
    setSelectedWorkspace(w.id);
    sessionStorage.setItem('treeguard_active_workspace', w.id);
    setSidebarOpen(false);
    navigate(w.href);
  };

  const handleLogout = async () => {
    setSidebarOpen(false);
    sessionStorage.removeItem('treeguard_active_workspace');
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.full_name || 'User';
  const displayInitial = displayName[0]?.toUpperCase() || 'U';
  const profileLabel =
    activeWorkspace === 'inspector'
      ? 'Inspector Profile'
      : activeWorkspace === 'admin'
      ? 'Admin Profile'
      : 'Profile / Account';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-forest-900 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-forest-800">
          <Link to="/app" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-forest-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="text-white font-display text-lg">TreeGuard</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-forest-300 hover:text-white"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Multi-workspace selector for authorized client accounts */}
        {canAccessAllDashboards && (
          <div className="px-3 pt-4 pb-3 border-b border-forest-800">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-forest-400 text-[11px] uppercase tracking-wider font-semibold">Workspace</p>
              <span className="text-[10px] bg-forest-800 text-forest-300 px-1.5 py-0.5 rounded font-mono">Client Access</span>
            </div>
            <div className="space-y-1">
              {workspaces.map((w) => {
                const isSelected = activeWorkspace === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleWorkspaceSelect(w)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-forest-700 text-white font-bold shadow-xs'
                        : 'text-forest-300 hover:bg-forest-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm leading-none ${isSelected ? 'text-emerald-400' : 'text-forest-400'}`}>
                        {isSelected ? '●' : '○'}
                      </span>
                      <span>{w.label}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Role-Specific Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const isRootDashboard =
              item.href === '/app/citizen' ||
              item.href === '/app/inspector' ||
              item.href === '/app/admin';

            let active = false;
            if (isRootDashboard) {
              active =
                loc.pathname === item.href ||
                (loc.pathname === '/app' && activeWorkspace === item.href.replace('/app/', ''));
            } else if (item.href === '/app/inspector/inspections') {
              active =
                loc.pathname === '/app/inspector/inspections' ||
                (loc.pathname.startsWith('/app/inspector/') &&
                  !['/app/inspector/assignments', '/app/inspector/emergency'].includes(loc.pathname) &&
                  !loc.pathname.startsWith('/app/inspector/followup/'));
            } else if (item.href === '/app/reports') {
              active = loc.pathname === '/app/reports' || loc.pathname.startsWith('/app/reports/');
            } else {
              active = loc.pathname === item.href || loc.pathname.startsWith(item.href + '/');
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-forest-700 text-white' : 'text-forest-200 hover:bg-forest-800 hover:text-white'
                }`}
              >
                <span className="w-5 text-center text-base leading-none">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Account / Logout */}
        <div className="px-3 py-4 border-t border-forest-800 space-y-1">
          <Link
            to="/app/profile"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-forest-200 hover:bg-forest-800 hover:text-white transition-colors truncate"
          >
            <div className="w-6 h-6 rounded-full bg-forest-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {displayInitial}
            </div>
            <div className="truncate flex-1 text-left">
              <span className="block truncate font-medium text-white">{displayName}</span>
              <span className="block text-[10px] text-forest-400">{profileLabel}</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-forest-300 hover:bg-forest-800 hover:text-white transition-colors cursor-pointer text-left"
          >
            <span className="w-5 text-center text-sm leading-none">⎋</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open sidebar"
          >
            ☰
          </button>
          <div className="flex-1" />
          <Link
            to="/app/notifications"
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Notifications"
          >
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
          </Link>
          <Link to="/app/profile" className="flex items-center gap-2 pl-2" title={displayName}>
            <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-white text-sm font-semibold">
              {displayInitial}
            </div>
          </Link>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
