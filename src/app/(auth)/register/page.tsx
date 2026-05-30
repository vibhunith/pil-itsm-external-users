'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { Eye, EyeOff, Lock, User, Mail, Building2, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';

const SPONSOR_EMAIL = 'vibhor@yoda-tech.com';

type FieldErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'company' | 'username' | 'password', string>>;

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (!company.trim()) errs.company = 'Company is required.';
    if (!username.trim()) errs.username = 'Username is required.';
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, company, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit your request. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image src="/pil-logo.png" alt="PIL" width={40} height={40} className="object-contain" />
          <div>
            <p className="text-gray-800 font-bold text-base">Pacific International Lines</p>
            <p className="text-gray-400 text-xs">IT Support Portal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {submitted ? (
            <div className="text-center py-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Request Submitted</h2>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Your access request has been sent to <span className="font-medium text-gray-700">{SPONSOR_EMAIL}</span> for approval.
                Once approved, your account will be activated and you&apos;ll be able to sign in.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#003087] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Request Access</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Fill in your details. A sponsor will review and approve your request.
                </p>
              </div>

              {error && <Alert message={error} variant="error" className="mb-5" />}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    error={errors.firstName}
                    required
                    autoComplete="given-name"
                  />
                  <Input
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    error={errors.lastName}
                    required
                    autoComplete="family-name"
                  />
                </div>

                <div className="relative">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    error={errors.email}
                    required
                    autoComplete="email"
                    className="pl-9"
                  />
                  <Mail className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
                </div>

                <div className="relative">
                  <Input
                    label="Company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company"
                    error={errors.company}
                    required
                    autoComplete="organization"
                    className="pl-9"
                  />
                  <Building2 className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
                </div>

                <div className="relative">
                  <Input
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
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
                    placeholder="Create a password (min 6 characters)"
                    error={errors.password}
                    required
                    autoComplete="new-password"
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

                {/* Sponsor — fixed, informational */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor (Approver)</label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#003087] flex-shrink-0" />
                    <span className="text-sm text-gray-600">{SPONSOR_EMAIL}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Your request will be sent here for approval.</p>
                </div>

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Submit Request
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-[#003087] hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
