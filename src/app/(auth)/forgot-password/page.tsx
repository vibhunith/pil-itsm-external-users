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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/pil-logo.png" alt="PIL" className="h-10 w-10 object-contain" />
          <div>
            <p className="text-[#1a2332] font-bold text-base">Pacific International Lines</p>
            <p className="text-gray-500 text-xs">IT Support Portal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#1a2332]">Reset Password</h2>
            <p className="text-gray-500 text-sm mt-1">
              Enter your registered email and we&apos;ll send you a reset link.
            </p>
          </div>

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
  );
}
