import React, { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '../../services/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit password reset request.');
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

          <h1 className="text-xl font-semibold text-gray-900 mb-1">Forgot your password?</h1>
          <p className="text-gray-500 text-sm mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-sm leading-relaxed">
                <p className="font-medium mb-1">Check your email</p>
                If an account exists for <span className="font-semibold">{email}</span>, a password reset link has been sent.
              </div>
              <p className="text-xs text-gray-500">
                Didn't receive the email? Check your spam folder or try requesting another link.
              </p>
              <Link
                to="/login"
                className="block text-center w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors mt-4"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Sending link...' : 'Send reset link'}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-sm text-forest-600 hover:text-forest-700 font-medium">
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
