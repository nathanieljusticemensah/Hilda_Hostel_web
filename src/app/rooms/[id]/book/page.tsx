import { redirect } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BookingConfirmButton from '@/components/BookingConfirmButton'
import SignOutButton from '@/components/SignOutButton'
import {
  Home,
  User,
  KeyRound,
  Lock,
  XCircle,
  ArrowLeft,
  Building2,
  Layers,
  BedDouble,
  CalendarDays,
} from 'lucide-react'

interface RoomAvailability {
  room_id: string
  room_number: string
  block: string
  floor: number
  tier: string
  capacity: number
  price_per_academic_year: number
  available_beds: number
}

function formatTier(tier: string): string {
  const match = tier.match(/^(\d+)_in_room$/)
  if (match) {
    return `${match[1]} in a Room`
  }
  return tier.replace(/_/g, ' ')
}

function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return `GH₵ ${formatted}`
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Confirm Booking</h1>
                <p className="text-xs text-slate-500">Room reservation</p>
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
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}

export default async function BookRoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // 2. Global booking phase + academic year
  const { data: settings, error: settingsError } = await supabase
    .from('system_settings')
    .select('active_academic_year, current_booking_phase')
    .eq('id', 1)
    .single()

  if (settingsError || !settings) {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 flex flex-col items-center text-center">
          <p className="text-sm font-semibold text-red-800">Couldn&apos;t load booking settings</p>
          <p className="text-sm text-red-700 mt-0.5">
            {settingsError?.message || 'Please try again in a moment.'}
          </p>
          <Link
            href="/rooms"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Room Catalog
          </Link>
        </div>
      </PageShell>
    )
  }

  const activeAcademicYear = settings.active_academic_year as string
  const bookingPhase = settings.current_booking_phase as 'closed' | 'retention_only' | 'open_booking'

  // Hard block: booking not open. Check this before even looking up the
  // room, since nothing after this point is actionable anyway.
  if (bookingPhase !== 'open_booking') {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center">
          <div className="p-3 bg-slate-100 rounded-full mb-4">
            <Lock className="w-6 h-6 text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Booking is currently closed</h2>
          <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
            You cannot book this room right now. Check back once the hostel opens booking for{' '}
            {activeAcademicYear}.
          </p>
          <Link
            href="/rooms"
            className="mt-5 inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 py-2.5 px-5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Room Catalog
          </Link>
        </div>
      </PageShell>
    )
  }

  // 3. Specific room + live availability
  const { data: room, error: roomError } = await supabase
    .from('room_availability_current')
    .select('room_id, room_number, block, floor, tier, capacity, price_per_academic_year, available_beds')
    .eq('room_id', id)
    .single()

  if (roomError || !room) {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center">
          <div className="p-3 bg-amber-50 rounded-full mb-4">
            <XCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Room not found</h2>
          <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
            This room doesn&apos;t exist or is no longer listed in the catalog.
          </p>
          <Link
            href="/rooms"
            className="mt-5 inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 py-2.5 px-5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Room Catalog
          </Link>
        </div>
      </PageShell>
    )
  }

  const typedRoom = room as RoomAvailability

  // `room_availability_current` doesn't expose `images`; fetch the cover
  // photo with a small follow-up query against `rooms` directly.
  const { data: roomImageRow } = await supabase
    .from('rooms')
    .select('images')
    .eq('id', id)
    .single()
  const coverImage = roomImageRow?.images?.[0] as string | undefined

  // Sold out block
  if (typedRoom.available_beds <= 0) {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center">
          <div className="p-3 bg-red-50 rounded-full mb-4">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Room {typedRoom.room_number} is sold out
          </h2>
          <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
            All beds in Block {typedRoom.block}, Room {typedRoom.room_number} have already been
            booked for {activeAcademicYear}. Try another room from the catalog.
          </p>
          <Link
            href="/rooms"
            className="mt-5 inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 py-2.5 px-5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Room Catalog
          </Link>
        </div>
      </PageShell>
    )
  }

  const roomLabel = `Block ${typedRoom.block}, Room ${typedRoom.room_number}`

  return (
    <PageShell>
      <Link
        href="/rooms"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Room Catalog
      </Link>

      {/* Receipt-style summary card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {coverImage && (
          <div className="relative w-full h-48 bg-slate-100">
            <NextImage src={`${coverImage}?tr=w-800,f-auto`} alt={roomLabel} fill className="object-cover" />
          </div>
        )}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <KeyRound className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Booking Summary</h3>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center pb-6 border-b border-dashed border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">You&apos;re Booking</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{roomLabel}</p>
          </div>

          <dl className="py-6 space-y-4 border-b border-dashed border-slate-200">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <Building2 className="w-4 h-4 text-slate-400" />
                Block
              </dt>
              <dd className="text-sm font-medium text-slate-900">{typedRoom.block}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <Layers className="w-4 h-4 text-slate-400" />
                Floor
              </dt>
              <dd className="text-sm font-medium text-slate-900">{typedRoom.floor}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <BedDouble className="w-4 h-4 text-slate-400" />
                Tier
              </dt>
              <dd className="text-sm font-medium text-slate-900">{formatTier(typedRoom.tier)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                Academic Year
              </dt>
              <dd className="text-sm font-medium text-slate-900">{activeAcademicYear}</dd>
            </div>
          </dl>

          <div className="pt-6 flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-slate-500">Total Price</span>
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(typedRoom.price_per_academic_year)}
            </span>
          </div>

          <BookingConfirmButton
            roomId={typedRoom.room_id}
            academicYear={activeAcademicYear}
            roomLabel={roomLabel}
          />
        </div>
      </div>
    </PageShell>
  )
}