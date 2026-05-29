'use client';
import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!newPassword) errs.newPassword = 'Password is required.';
    else if (!PASSWORD_RULES.test(newPassword))
      errs.newPassword =
        'Password must be 8+ chars with uppercase, lowercase, number, and special character.';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password.';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Reset failed.'); return; }
      setSuccess('Password updated successfully. You can now sign in.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <Alert message="Invalid or missing reset link." variant="error" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert message={error} variant="error" />}
      {success && <Alert message={success} variant="success" />}

      {!success && (
        <>
          <div className="relative">
            <Input
              label="New Password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              error={fieldErrors.newPassword}
              required
              className="pl-9 pr-10"
            />
            <Lock className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-[34px] text-gray-400">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              error={fieldErrors.confirmPassword}
              required
              className="pl-9 pr-10"
            />
            <Lock className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-[34px] text-gray-400">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <ul className="text-xs text-gray-500 space-y-0.5 pl-4 list-disc">
            <li>Minimum 8 characters</li>
            <li>At least one uppercase letter</li>
            <li>At least one lowercase letter</li>
            <li>At least one number</li>
            <li>At least one special character</li>
          </ul>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Reset Password
          </Button>
        </>
      )}

      {success && (
        <Link href="/login" className="block">
          <Button className="w-full" size="lg">Sign In</Button>
        </Link>
      )}

      <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-[#003087] hover:underline font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Sign In
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003087] via-[#004BB4] to-[#0066CC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#003087] px-8 py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#003087] font-bold text-xl shadow">PIL</div>
            <h1 className="text-xl font-bold text-white">Pacific International Lines</h1>
            <p className="mt-1 text-sm text-blue-200">IT Support Portal</p>
          </div>
          <div className="px-8 py-8">
            <h2 className="mb-6 text-center text-lg font-semibold text-gray-800">Set New Password</h2>
            <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
