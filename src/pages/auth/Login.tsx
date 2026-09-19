import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Flash message from navigation (e.g. registration success or reset password)
  const flashMessage = location.state?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login({
        email: email.trim(),
        password,
        remember_me: remember,
      });

      // Role-based landing redirect
      if (user.role === 'inspector') {
        navigate('/app/inspector', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/app/admin', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-forest-900 p-12 relative overflow-hidden">
        {/* Ambient glow backdrop */}
        <div className="absolute top-1/2 -translate-y-1/2 right-6 w-96 h-96 bg-forest-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Tree visual on the right */}
        <div className="absolute right-0 bottom-0 top-0 w-[55%] flex items-end justify-center pointer-events-none select-none z-0">
          <img
            src="/images/tree-hero.jpg"
            alt="Healthy mature urban tree"
            className="w-full max-h-[88%] object-contain object-bottom drop-shadow-2xl [mask-image:radial-gradient(ellipse_at_center,black_65%,transparent_100%)] opacity-95"
          />
        </div>

        <div className="relative z-10 max-w-sm">
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
            <span className="text-white font-display text-xl">TreeGuard</span>
          </div>
          <h2 className="font-display text-3xl text-white mb-4 leading-tight">
            Protecting communities,<br />one tree at a time.
          </h2>
          <p className="text-forest-300 leading-relaxed">
            Monitor urban tree health, detect emergencies early, and coordinate field responses — all in one platform.
          </p>
        </div>

        <div className="space-y-4 relative z-10">
          {[
            { icon: '🌳', text: '14,200+ trees monitored across 23 cities' },
            { icon: '⚡', text: '4.1 hr average emergency response time' },
            { icon: '🤖', text: '98.2% AI detection accuracy' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <span className="text-forest-200 text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your TreeGuard account</p>
          </div>

          {flashMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 text-sm font-medium">
              {flashMessage}
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span>Password</span>
                <Link to="/forgot-password" className="float-right text-forest-600 hover:text-forest-700 font-normal">Forgot password?</Link>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">Remember me</label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <span className="text-lg">🌐</span>
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-forest-600 hover:text-forest-700 font-medium">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

