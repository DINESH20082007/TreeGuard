import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authApi } from '../../services/auth';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Your reset link is invalid or has expired.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Your password has been reset. Please sign in.' },
          replace: true,
        });
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Your reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-forest-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              T
            </div>
            <span className="text-forest-900 font-display text-lg">TreeGuard</span>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-1">Set new password</h1>
          <p className="text-gray-500 text-sm mb-6">
            Please enter your new password below.
          </p>

          {!token && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              Missing password reset token. Please check the link from your email.
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 text-sm font-medium">
              Your password has been reset. Redirecting to Sign In...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token || success}
              className="w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Updating password...' : 'Reset password'}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-sm text-forest-600 hover:text-forest-700 font-medium">
                ← Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
