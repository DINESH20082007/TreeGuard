import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../services/notifications';

type Role = 'citizen' | 'inspector' | 'admin';

const citizenNav = [
  { label: 'Dashboard', href: '/app', icon: '⬡' },
  { label: 'Tree Map', href: '/app/map', icon: '◎' },
  { label: 'Report a Tree', href: '/app/report', icon: '+' },
  { label: 'My Reports', href: '/app/reports', icon: '≡' },
  { label: 'Emergency', href: '/app/emergency', icon: '!' },
  { label: 'Notifications', href: '/app/notifications', icon: '◉' },
];

const inspectorNav = [
  { label: 'Dashboard', href: '/app/inspector', icon: '⬡' },
  { label: 'Tree Map', href: '/app/map', icon: '◎' },
  { label: 'Recovery & Monitoring', href: '/app/admin/monitoring', icon: '◈' },
  { label: 'Notifications', href: '/app/notifications', icon: '◉' },
];

const adminNav = [
  { label: 'Dashboard', href: '/app/admin', icon: '⬡' },
  { label: 'Emergency Map', href: '/app/map', icon: '◎' },
  { label: 'Analytics', href: '/app/admin/analytics', icon: '∿' },
  { label: 'Monitoring', href: '/app/admin/monitoring', icon: '◈' },
  { label: 'Reports', href: '/app/reports', icon: '≡' },
  { label: 'Notifications', href: '/app/notifications', icon: '◉' },
];

const roleSubLabels: Record<Role, string> = {
  citizen: 'Citizen',
  inspector: 'Field Inspector',
  admin: 'Organization Admin',
};

export default function AppLayout() {
  const { user, role: authRole, switchRole, logout } = useAuth();
  const [role, setRole] = useState<Role>((authRole as Role) || 'citizen');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const loc = useLocation();
  const navigate = useNavigate();

  // Sync role with authenticated user's actual role
  useEffect(() => {
    if (authRole) {
      setRole(authRole as Role);
    }
  }, [authRole]);

  // Fetch real unread notification count
  useEffect(() => {
    let mounted = true;
    async function checkUnread() {
      try {
        const res = await notificationsApi.getUnreadCount();
        if (mounted) setUnreadCount(res.unread_count || 0);
      } catch {
        // Silently handle if unauthenticated
      }
    }
    checkUnread();
    return () => { mounted = false; };
  }, [loc.pathname, user]);

  const nav = role === 'citizen' ? citizenNav : role === 'inspector' ? inspectorNav : adminNav;

  const handleRoleChange = (r: Role) => {
    setRole(r);
    switchRole(r);
    if (r === 'inspector') navigate('/app/inspector');
    else if (r === 'admin') navigate('/app/admin');
    else navigate('/app');
  };

  const handleLogout = async () => {
    setSidebarOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.full_name || 'User';
  const displayInitial = displayName[0]?.toUpperCase() || 'U';


  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-forest-900 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-forest-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-forest-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="text-white font-display text-lg">TreeGuard</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-forest-300 hover:text-white">✕</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = item.href === '/app'
              ? loc.pathname === '/app'
              : loc.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-forest-700 text-white'
                    : 'text-forest-200 hover:bg-forest-800 hover:text-white'
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

        {/* Role switcher (demo presentation mode) */}
        <div className="px-3 pb-4 border-t border-forest-800 pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-forest-400 text-[11px] uppercase tracking-wider font-semibold">Demo Role</p>
            <span className="text-[10px] bg-forest-800 text-forest-300 px-1.5 py-0.5 rounded font-mono">Presentation</span>
          </div>
          {(['citizen', 'inspector', 'admin'] as Role[]).map((r) => {
            const isSelected = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isSelected ? 'bg-forest-700 text-white font-bold shadow-xs' : 'text-forest-300 hover:bg-forest-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm leading-none ${isSelected ? 'text-emerald-400' : 'text-forest-400'}`}>
                    {isSelected ? '●' : '○'}
                  </span>
                  <span>{roleSubLabels[r]}</span>
                </div>
                {isSelected && (
                  <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-forest-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-forest-200 hover:bg-forest-800 hover:text-white transition-colors cursor-pointer text-left"
          >
            <span className="w-5 text-center text-base leading-none">⎋</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ☰
          </button>
          <div className="flex-1" />
          <Link
            to="/app/notifications"
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Link>
          <Link to="/app/profile" className="flex items-center gap-2 pl-2" title={displayName}>
            <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-white text-sm font-semibold">
              {displayInitial}
            </div>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
