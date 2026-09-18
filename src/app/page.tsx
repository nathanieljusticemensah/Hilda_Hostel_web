import { redirect } from 'next/navigation'
import Link from 'next/link'
import LiveUtilities from '@/components/LiveUtilities'
import { createClient } from '@/lib/supabase/server'
import { BedDouble, ArrowRight, Megaphone } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  // Public vacancy counter: how many beds are open right now, without
  // requiring a room-by-room browse. Room catalog itself is public too
  // (see /rooms), this is just a teaser for the landing page.
  const { data: settings } = await supabase
    .from('system_settings')
    .select('active_academic_year, current_booking_phase')
    .eq('id', 1)
    .single()

  let availableBeds: number | null = null
  if (settings?.current_booking_phase === 'open_booking') {
    const { data: rooms } = await supabase
      .from('room_availability_current')
      .select('available_beds')
    availableBeds = (rooms ?? []).reduce((sum, r) => sum + Math.max(r.available_beds, 0), 0)
  }

  const { data: pinnedAnnouncements } = await supabase
    .from('announcements')
    .select('id, title, category')
    .eq('is_pinned', true)
    .order('created_at', { ascending: false })
    .limit(3)

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
          <nav className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <Link href="/rooms" className="hover:text-slate-900">Rooms</Link>
            <Link href="/announcements" className="hover:text-slate-900">Announcements</Link>
            <Link href="/login" className="hover:text-slate-900">Sign In</Link>
            <a href="/admin/utilities" className="hover:text-slate-900">Staff</a>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {availableBeds !== null && (
          <Link
            href="/rooms"
            className="surface-card group flex items-center justify-between gap-4 p-5 hover:shadow-md hover:border-indigo-200 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <BedDouble className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {availableBeds} {availableBeds === 1 ? 'bed' : 'beds'} available for {settings?.active_academic_year}
                </p>
                <p className="text-xs text-slate-500">Browse the room catalog and book instantly</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </Link>
        )}

        {pinnedAnnouncements && pinnedAnnouncements.length > 0 && (
          <section className="surface-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">Pinned Announcements</h2>
            </div>
            <ul className="space-y-2">
              {pinnedAnnouncements.map((a) => (
                <li key={a.id}>
                  <Link href="/announcements" className="text-sm text-slate-700 hover:text-indigo-600 transition-colors duration-200">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/announcements" className="inline-block mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all announcements →
            </Link>
          </section>
        )}

        <section>
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
