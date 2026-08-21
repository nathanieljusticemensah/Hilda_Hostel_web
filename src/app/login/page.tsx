import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default function LoginPage() {
  async function signIn(formData: FormData) {
    'use server'
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // simple server-side error handling — re-render with message could be added
      return
    }

    const session = data.session
    if (session) {
      // @supabase/ssr will set cookies automatically via its adapter
      redirect('/admin/utilities')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">Hostel Login</h1>
        <p className="text-sm text-slate-600 mb-4">Sign in to access staff panels and utilities control.</p>
        <form action={signIn} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Email</label>
            <input name="email" type="email" required className="mt-1 block w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Password</label>
            <input name="password" type="password" required className="mt-1 block w-full rounded border px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" className="rounded bg-emerald-600 text-white px-4 py-2 text-sm">Sign in</button>
            <a href="/" className="text-sm text-slate-600">Back</a>
          </div>
        </form>
      </div>
    </div>
  )
}
