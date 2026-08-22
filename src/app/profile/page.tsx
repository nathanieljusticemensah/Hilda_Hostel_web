import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from '@/components/ProfileForm'
import SignOutButton from '@/components/SignOutButton'
import { Home, User as UserIcon, Mail, ShieldCheck, DoorOpen, CalendarDays } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  resident: 'Resident',
  applicant: 'Applicant',
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already guards /profile, but this page should be safe
  // standalone too, same convention as admin/layout.tsx.
  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, phone_number, role, room_id, created_at')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    redirect('/')
  }

  let room: { room_number: string; block: string; floor: number } | null = null
  if (profile.room_id) {
    const { data: roomData } = await supabase
      .from('rooms')
      .select('room_number, block, floor')
      .eq('id', profile.room_id)
      .single()
    room = roomData
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md">
                {(profile.full_name || 'H').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">My Profile</h1>
                <p className="text-xs text-slate-500">Account details &amp; preferences</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Account summary card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <UserIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Account</h3>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</p>
                <p className="text-sm text-slate-900 mt-0.5">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Role</p>
                <p className="text-sm text-slate-900 mt-0.5">
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DoorOpen className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Room</p>
                <p className="text-sm text-slate-900 mt-0.5">
                  {room ? `${room.room_number} · Block ${room.block}, Floor ${room.floor}` : 'Not assigned'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Member Since</p>
                <p className="text-sm text-slate-900 mt-0.5">{memberSince}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <UserIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Edit Details</h3>
            </div>
          </div>
          <div className="p-6">
            <ProfileForm
              userId={user.id}
              initialFullName={profile.full_name || ''}
              initialPhoneNumber={profile.phone_number || ''}
            />
          </div>
        </div>
      </main>
    </div>
  )
}