import { Outlet, Link, useLocation } from 'react-router';

export default function PublicLayout() {
  const loc = useLocation();
  const isLanding = loc.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col">
      {!isLanding && (
        <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-forest-800 font-display text-xl">TreeGuard</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-gray-600 hover:text-forest-700 font-medium px-3 py-2 rounded-lg transition-colors">Sign in</Link>
              <Link to="/register" className="text-sm bg-forest-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors">Get started</Link>
            </div>
          </div>
        </header>
      )}
      <main className={!isLanding ? 'flex-1 pt-16' : 'flex-1'}>
        <Outlet />
      </main>
    </div>
  );
}
