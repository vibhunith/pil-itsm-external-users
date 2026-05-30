'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { Eye, EyeOff, Lock, User, ShieldCheck, Headphones, Clock, Loader2 } from 'lucide-react';

const FEATURES = [
  { Icon: Headphones, title: 'Raise Issues', desc: 'Log IT issues and get prompt support from our team.' },
  { Icon: Clock, title: 'Track in Real-Time', desc: 'Monitor ticket status and SLA deadlines at a glance.' },
  { Icon: ShieldCheck, title: 'Secure & Reliable', desc: 'Your data is protected on Microsoft SharePoint.' },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
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
        setLoading(false);
        return;
      }
      // Clear any stale ticket state from a previous session
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('pil_ticket_'))
          .forEach((k) => localStorage.removeItem(k));
      } catch { /* ignore */ }
      // Keep the loader up through the (slow) navigation to the dashboard —
      // the dashboard server-renders SharePoint data, so this can take a few seconds.
      setRedirecting(true);
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── Full-screen overlay shown while redirecting to the dashboard ── */}
      {redirecting && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-10 w-10 animate-spin text-[#003087]" />
          <p className="text-sm font-medium text-gray-600">Signing you in…</p>
        </div>
      )}

      {/* ── Left info panel ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-white border-r border-gray-200 flex-col justify-between p-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image src="/pil-logo.png" alt="PIL" width={44} height={44} className="object-contain" />
          <div>
            <p className="text-gray-800 font-bold text-base leading-tight">Pacific International Lines</p>
            <p className="text-gray-400 text-xs">IT Support Portal</p>
          </div>
        </div>

        {/* Centre copy */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 leading-tight">
              Welcome to<br />
              <span className="text-[#003087]">PIL IT Support</span>
            </h1>
            <p className="mt-3 text-gray-500 text-sm leading-relaxed max-w-sm">
              Your single point of contact for all IT-related requests, issues, and service needs across PIL operations.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0">
                  <Icon className="h-4.5 w-4.5 text-[#003087]" />
                </div>
                <div>
                  <p className="text-gray-800 font-semibold text-sm">{title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-400 text-xs">
          © {new Date().getFullYear()} Pacific International Lines Pte Ltd. All rights reserved.
        </p>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <Image src="/pil-logo.png" alt="PIL" width={40} height={40} className="object-contain" />
            <div>
              <p className="text-gray-800 font-bold text-base">Pacific International Lines</p>
              <p className="text-gray-400 text-xs">IT Support Portal</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="mb-7">
              <h2 className="text-xl font-bold text-gray-800">Sign In</h2>
              <p className="text-gray-400 text-sm mt-1">Enter your credentials to access the portal</p>
            </div>

            {error && <Alert message={error} variant="error" className="mb-5" />}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                <Link href="/forgot-password" className="text-xs text-[#003087] hover:underline font-medium">
                  Forgot Password?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign In
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[#003087] hover:underline font-medium">
                Request access
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Pacific International Lines Pte Ltd
          </p>
        </div>
      </div>
    </div>
  );
}
