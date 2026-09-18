import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { Building, Mail, Lock, ArrowLeft, AlertCircle } from 'lucide-react'

const credentialsSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  async function signIn(formData: FormData) {
    'use server'
    const next = String(formData.get('next') || '')
    // Only honor same-origin, relative paths for `next` to avoid an open
    // redirect.
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : ''
    const nextParam = safeNext ? `&next=${encodeURIComponent(safeNext)}` : ''

    const parsed = credentialsSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    })
    if (!parsed.success) {
      redirect(`/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Invalid input')}${nextParam}`)
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

    if (error || !data.user) {
      redirect(`/login?error=${encodeURIComponent('Invalid email or password')}${nextParam}`)
    }

    // The dashboard handles the final role check and forwards staff/admin
    // users to their appropriate admin view, so all authenticated users
    // should land here after a successful sign-in unless `next` says otherwise.
    redirect(safeNext || '/dashboard')
  }

  const { error, next } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/80 p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors duration-200 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Back to Home
        </Link>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <Building className="w-6 h-6 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
            </div>
            <p className="text-sm text-slate-500">
              Sign in to access staff panels and utilities control
            </p>
          </div>

          {/* Form */}
          <form action={signIn} className="px-8 py-6 space-y-5">
            {next && <input type="hidden" name="next" value={next} />}
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <a 
                  href="/forgot-password" 
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-200"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md group"
            >
              <span>Sign In</span>
              <svg 
                className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            {/* Footer */}
            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                By signing in, you agree to our{' '}
                <a href="/terms" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Privacy Policy
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Need help? Contact{' '}
            <a href="mailto:support@hostel.com" className="text-indigo-600 hover:text-indigo-700 font-medium">
              support@hostel.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}