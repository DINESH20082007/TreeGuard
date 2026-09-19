import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../services/auth';

type AccountTypeOption = 'citizen' | 'inspector' | 'organization';

const accountTypes: { value: AccountTypeOption; label: string; desc: string; role: UserRole }[] = [
  { value: 'citizen', label: 'Citizen', desc: 'Report tree issues and track your submissions', role: 'citizen' },
  { value: 'inspector', label: 'Inspector / Field Team', desc: 'Receive assignments and conduct inspections', role: 'inspector' },
  { value: 'organization', label: 'Organization / Admin', desc: 'Manage trees and teams across your jurisdiction', role: 'admin' },
];

export default function Register() {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountTypeOption>('citizen');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { register } = useAuth();

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
      setStep(2);
      return;
    }

    // Step 2 submission
    setLoading(true);
    const selectedOption = accountTypes.find((a) => a.value === accountType);
    const role: UserRole = selectedOption?.role || 'citizen';

    try {
      await register({
        full_name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      // Flow requirement: Do NOT log in automatically. Redirect to Sign In.
      navigate('/login', {
        state: { message: 'Account created successfully! Please sign in with your credentials.' },
        replace: true,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
      setStep(1); // Go back to step 1 so user can correct fields
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${s <= step ? 'bg-forest-700 text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
              {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-forest-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h1>
              <p className="text-gray-500 text-sm mb-6">Start protecting trees in your community</p>
              <form onSubmit={handleNext} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors cursor-pointer"
                >
                  Continue
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Choose account type</h1>
              <p className="text-gray-500 text-sm mb-6">Select the role that describes how you'll use TreeGuard</p>
              <form onSubmit={handleNext} className="space-y-3">
                {accountTypes.map((at) => (
                  <label
                    key={at.value}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      accountType === at.value ? 'border-forest-600 bg-forest-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={at.value}
                      checked={accountType === at.value}
                      onChange={() => setAccountType(at.value)}
                      className="mt-0.5 text-forest-600"
                    />
                    <div>
                      <p className={`font-medium text-sm ${accountType === at.value ? 'text-forest-800' : 'text-gray-800'}`}>{at.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{at.desc}</p>
                    </div>
                  </label>
                ))}
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 border border-gray-200 text-gray-600 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <Link to="/login" className="text-forest-600 hover:text-forest-700 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

