'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!username.trim()) errs.username = 'Username is required.';
    if (!password.trim()) errs.password = 'Password is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed. Please try again.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003087] via-[#004BB4] to-[#0066CC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#003087] px-8 py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#003087] font-bold text-xl shadow">
              PIL
            </div>
            <h1 className="text-xl font-bold text-white">Pacific International Lines</h1>
            <p className="mt-1 text-sm text-blue-200">IT Support Portal</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="mb-6 text-center text-lg font-semibold text-gray-800">
              Sign in to your account
            </h2>

            {error && <Alert message={error} variant="error" className="mb-4" />}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="relative">
                <Input
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  error={errors.username}
                  required
                  autoComplete="username"
                  className="pl-9"
                />
                <User className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
              </div>

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  error={errors.password}
                  required
                  autoComplete="current-password"
                  className="pl-9 pr-10"
                />
                <Lock className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#003087] hover:underline font-medium"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign In
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              Don&apos;t have an account?{' '}
              <span className="text-gray-600">Contact your IT support administrator.</span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-blue-200">
          © {new Date().getFullYear()} Pacific International Lines Pte Ltd
        </p>
      </div>
    </div>
  );
}
