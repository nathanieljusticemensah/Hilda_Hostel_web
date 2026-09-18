import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LiveUtilities from '@/components/LiveUtilities'
import SignOutButton from '@/components/SignOutButton'
import {
  DoorOpen,
  AlertCircle,
  Wrench,
  KeyRound,
  Search,
  Megaphone,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // 2. Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role, room_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  // 3. Redirect staff/admin away
  if (profile.role === 'admin' || profile.role === 'staff') {
    redirect('/admin/tickets')
  }

  // 4. Get room details if assigned
  let roomDetails: { room_number: string; block: string } | null = null
  if (profile.room_id) {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_number, block')
      .eq('id', profile.room_id)
      .single()

    if (!roomError && room) {
      roomDetails = room
    }
  }

  // Extract first name
  const firstName = profile.full_name?.split(' ')[0] || 'Resident'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Welcome back, {firstName} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <SignOutButton variant="header" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Live Utilities Widget */}
        <div className="mb-8">
          <LiveUtilities />
        </div>

        {/* Status Banner */}
        {roomDetails ? (
          <div className="mb-8 bg-gradient-to-r from-indigo-50 to-indigo-100/70 border border-indigo-200 rounded-2xl shadow-sm p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <DoorOpen className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-700 uppercase tracking-wider">
                Current Allocation
              </p>
              <p className="text-lg sm:text-xl font-bold text-slate-900">
                Block {roomDetails.block}, Room {roomDetails.room_number}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-8 bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-200 rounded-2xl shadow-sm p-4 sm:p-6 flex items-center gap-4">
            <div className="p-2 bg-amber-600 rounded-xl text-white">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">
                Status
              </p>
              <p className="text-lg sm:text-xl font-bold text-slate-900">
                No room assigned for the current academic year.
              </p>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Maintenance Card */}
          <Link
            href="/tickets"
            className="surface-card group hover:shadow-lg hover:border-indigo-200 transition-all duration-300 p-6 flex flex-col items-start"
          >
            <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors duration-300 mb-4">
              <Wrench className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Maintenance
            </h3>
            <p className="text-sm text-slate-500 flex-1">
              View or report issues in your room
            </p>
            <span className="mt-4 text-sm font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors duration-200">
              View tickets →
            </span>
          </Link>

          {/* Retain Room Card */}
          <Link
            href="/retention"
            className="surface-card group hover:shadow-lg hover:border-indigo-200 transition-all duration-300 p-6 flex flex-col items-start"
          >
            <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors duration-300 mb-4">
              <KeyRound className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Retain Room
            </h3>
            <p className="text-sm text-slate-500 flex-1">
              Request to keep your current room for next year
            </p>
            <span className="mt-4 text-sm font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors duration-200">
              Request retention →
            </span>
          </Link>

          {/* Book New Room Card */}
          <Link
            href="/rooms"
            className="surface-card group hover:shadow-lg hover:border-indigo-200 transition-all duration-300 p-6 flex flex-col items-start"
          >
            <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors duration-300 mb-4">
              <Search className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Book New Room
            </h3>
            <p className="text-sm text-slate-500 flex-1">
              Browse available rooms for the upcoming academic year
            </p>
            <span className="mt-4 text-sm font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors duration-200">
              Browse rooms →
            </span>
          </Link>

          {/* Announcements Card */}
          <Link
            href="/announcements"
            className="surface-card group hover:shadow-lg hover:border-indigo-200 transition-all duration-300 p-6 flex flex-col items-start"
          >
            <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors duration-300 mb-4">
              <Megaphone className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Announcements
            </h3>
            <p className="text-sm text-slate-500 flex-1">
              Notices and emergency contacts from hostel staff
            </p>
            <span className="mt-4 text-sm font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors duration-200">
              View announcements →
            </span>
          </Link>
        </div>

        {/* Quick Stats Section */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface-card p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Role
            </p>
            <p className="text-lg font-semibold text-slate-900 mt-1 capitalize">
              {profile.role}
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Room Status
            </p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {roomDetails ? 'Assigned' : 'Unassigned'}
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Member Since
            </p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}