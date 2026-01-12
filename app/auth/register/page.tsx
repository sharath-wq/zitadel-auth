'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, User } from 'lucide-react';
import {
  AuthLayout,
  Button,
  Input,
  PasswordInput,
  Alert,
} from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string[]> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = ['First name is required'];
    }

    if (!formData.lastName.trim()) {
      errors.lastName = ['Last name is required'];
    }

    if (!formData.email.trim()) {
      errors.email = ['Email is required'];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = ['Please enter a valid email address'];
    }

    if (!formData.password) {
      errors.password = ['Password is required'];
    } else if (formData.password.length < 8) {
      errors.password = ['Password must be at least 8 characters'];
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = ['Passwords do not match'];
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        }
        throw new Error(data.error || 'Registration failed');
      }

      // Redirect to login with success message
      router.push('/auth/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Get started with your free account"
    >
      {error && <Alert type="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-5 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="firstName"
            type="text"
            placeholder="John"
            value={formData.firstName}
            onChange={handleChange}
            error={fieldErrors.firstName?.[0]}
            icon={<User className="w-5 h-5" />}
            required
            autoComplete="given-name"
          />

          <Input
            label="Last Name"
            name="lastName"
            type="text"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            error={fieldErrors.lastName?.[0]}
            required
            autoComplete="family-name"
          />
        </div>

        <Input
          label="Email Address"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email?.[0]}
          icon={<Mail className="w-5 h-5" />}
          required
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          name="password"
          placeholder="Create a strong password"
          value={formData.password}
          onChange={handleChange}
          error={fieldErrors.password?.[0]}
          showStrength
          required
          autoComplete="new-password"
        />

        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={fieldErrors.confirmPassword?.[0]}
          required
          autoComplete="new-password"
        />

        <div className="text-sm text-slate-600">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-primary-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-primary-600 hover:underline">
            Privacy Policy
          </a>
          .
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
