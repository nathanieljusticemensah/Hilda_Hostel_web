import { redirect } from 'next/navigation'
import LiveUtilities from '@/components/LiveUtilities'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold">H</div>
            <div>
              <div className="text-sm font-semibold">Hilda Hostel</div>
              <div className="text-xs text-slate-500">Student Dashboard</div>
            </div>
          </div>
          <nav className="flex items-center gap-3">
            <a href="/admin/utilities" className="text-xs text-slate-600 hover:text-slate-900">
              Staff
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <section className="mb-6">
          <h1 className="text-2xl font-semibold">Live Utility Status</h1>
          <p className="text-sm text-slate-600">Current building water and power statuses (cached for offline use).</p>
        </section>

        <section>
          <LiveUtilities />
        </section>
      </main>
    </div>
  )
}
