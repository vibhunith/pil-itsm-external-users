'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setEmailError('Email is required.'); return; }
    setEmailError('');
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      setSuccess(data.message ?? 'Reset link sent. Please check your email.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003087] via-[#004BB4] to-[#0066CC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#003087] px-8 py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#003087] font-bold text-xl shadow">
              PIL
            </div>
            <h1 className="text-xl font-bold text-white">Pacific International Lines</h1>
            <p className="mt-1 text-sm text-blue-200">IT Support Portal</p>
          </div>

          <div className="px-8 py-8">
            <h2 className="mb-2 text-center text-lg font-semibold text-gray-800">Reset Password</h2>
            <p className="mb-6 text-center text-sm text-gray-500">
              Enter your registered email address and we&apos;ll send you a reset link.
            </p>

            {error && <Alert message={error} variant="error" className="mb-4" />}
            {success && <Alert message={success} variant="success" className="mb-4" />}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    error={emailError}
                    required
                    className="pl-9"
                  />
                  <Mail className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
                </div>

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Send Reset Link
                </Button>
              </form>
            )}

            <Link
              href="/login"
              className="mt-6 flex items-center justify-center gap-2 text-sm text-[#003087] hover:underline font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
