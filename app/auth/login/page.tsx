'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
import {
  AuthLayout,
  Button,
  Input,
  PasswordInput,
  Alert,
  Divider,
} from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check for URL params (e.g., after registration or logout)
  const registered = searchParams.get('registered');
  const loggedOut = searchParams.get('logged_out');
  const urlError = searchParams.get('error');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store tokens in localStorage for client-side access if needed
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle PKCE flow login
  const handlePKCELogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      {/* Status messages */}
      {registered && (
        <Alert
          type="success"
          message="Registration successful! Please check your email and then sign in."
          onClose={() => router.replace('/auth/login')}
        />
      )}
      {loggedOut && (
        <Alert
          type="info"
          message="You have been logged out successfully."
          onClose={() => router.replace('/auth/login')}
        />
      )}
      {urlError && (
        <Alert
          type="error"
          message={decodeURIComponent(urlError)}
          onClose={() => router.replace('/auth/login')}
        />
      )}
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <form onSubmit={handleSubmit} className="space-y-5 mt-4">
        <Input
          label="Email or Username"
          name="username"
          type="text"
          placeholder="you@example.com"
          value={formData.username}
          onChange={handleChange}
          icon={<Mail className="w-5 h-5" />}
          required
          autoComplete="username"
        />

        <div>
          <PasswordInput
            label="Password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
          <div className="mt-2 text-right">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Sign In
        </Button>
      </form>

      <Divider text="or" />

      {/* Alternative login methods */}
      <Button
        type="button"
        variant="outline"
        onClick={handlePKCELogin}
        className="w-full"
      >
        Sign in with Zitadel
      </Button>

      <p className="mt-6 text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/register"
          className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
        >
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
