'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthLayout, Button, PasswordInput, Alert, Input } from '@/components/ui';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get userId and code from URL params (from Zitadel email link)
  const userId = searchParams.get('userId') || searchParams.get('user_id') || '';
  const code = searchParams.get('code') || '';

  const [formData, setFormData] = useState({
    userId: userId,
    code: code,
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Update form when URL params are available
  useEffect(() => {
    if (userId || code) {
      setFormData((prev) => ({
        ...prev,
        userId: userId || prev.userId,
        code: code || prev.code,
      }));
    }
  }, [userId, code]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!formData.userId || !formData.code) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formData.userId,
          code: formData.code,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Password reset successful"
        subtitle="Your password has been updated"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-slate-600">
            Your password has been successfully reset. You can now sign in with
            your new password.
          </p>
        </div>

        <div className="mt-8">
          <Button
            onClick={() => router.push('/auth/login')}
            className="w-full"
          >
            Sign In
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your new password below"
    >
      {error && <Alert type="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-5 mt-4">
        {/* Show userId and code fields if not provided in URL */}
        {(!userId || !code) && (
          <>
            <Input
              label="User ID"
              name="userId"
              type="text"
              placeholder="Enter user ID from email"
              value={formData.userId}
              onChange={handleChange}
              required
            />
            <Input
              label="Verification Code"
              name="code"
              type="text"
              placeholder="Enter code from email"
              value={formData.code}
              onChange={handleChange}
              required
            />
          </>
        )}

        <PasswordInput
          label="New Password"
          name="newPassword"
          placeholder="Enter your new password"
          value={formData.newPassword}
          onChange={handleChange}
          showStrength
          required
          autoComplete="new-password"
        />

        <PasswordInput
          label="Confirm New Password"
          name="confirmPassword"
          placeholder="Confirm your new password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          autoComplete="new-password"
        />

        <Button type="submit" loading={loading} className="w-full">
          Reset Password
        </Button>
      </form>

      <div className="mt-6">
        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
