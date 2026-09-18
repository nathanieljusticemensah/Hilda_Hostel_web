import Link from 'next/link'
import NextImage from 'next/image'
import { createClient } from '@/lib/supabase/server'
import {
  BedDouble,
  Building2,
  AlertTriangle,
  CalendarDays,
  Home,
  User,
  LogIn,
  LayoutGrid,
} from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'

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
  // '1_in_room' -> '1 in a Room', '4_in_room' -> '4 in a Room'
  const match = tier.match(/^(\d+)_in_room$/)
  if (match) {
    return `${match[1]} in a Room`
  }
  // Fallback for any unexpected tier value: just humanize the underscores
  return tier.replace(/_/g, ' ')
}

function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return `GH₵ ${formatted} / year`
}

export default async function RoomCatalogPage() {
  const supabase = await createClient()

  // Room catalog is public (RLS on `rooms` allows anyone to read it) —
  // applicants can browse without an account. Only booking itself requires
  // sign-in, enforced on the /rooms/[id]/book page.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2. Global booking phase + academic year
  const { data: settings, error: settingsError } = await supabase
    .from('system_settings')
    .select('active_academic_year, current_booking_phase')
    .eq('id', 1)
    .single()

  if (settingsError || !settings) {
    // Nothing sensible to render without knowing the phase/year, since
    // both the banner and every card's action button depend on it.
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 max-w-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Couldn&apos;t load the room catalog</p>
            <p className="text-sm text-red-700 mt-0.5">
              {settingsError?.message || 'Booking settings are unavailable right now.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const activeAcademicYear = settings.active_academic_year as string
  const bookingPhase = settings.current_booking_phase as 'closed' | 'retention_only' | 'open_booking'
  const isOpenBooking = bookingPhase === 'open_booking'

  // 3. Live availability from the view
  const { data: rooms, error: roomsError } = await supabase
    .from('room_availability_current')
    .select('room_id, room_number, block, floor, tier, capacity, price_per_academic_year, available_beds')
    .order('block', { ascending: true })
    .order('room_number', { ascending: true })

  const roomList = (rooms ?? []) as RoomAvailability[]

  // `room_availability_current` doesn't expose `images` (it's a fixed-shape
  // DB function return type), so pull cover photos with a small follow-up
  // query against `rooms` directly rather than changing the view.
  const roomIds = roomList.map((r) => r.room_id)
  const imagesByRoomId = new Map<string, string[]>()
  if (roomIds.length > 0) {
    const { data: roomImages } = await supabase
      .from('rooms')
      .select('id, images')
      .in('id', roomIds)
    for (const r of roomImages ?? []) {
      imagesByRoomId.set(r.id, r.images ?? [])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Room Catalog</h1>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CalendarDays className="w-3 h-3 text-slate-400" />
                  {activeAcademicYear}
                </p>
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
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>
                  <div className="h-6 w-px bg-slate-200" />
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all duration-200"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Room Catalog
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Browse rooms and live availability for {activeAcademicYear}.
          </p>
        </div>

        {/* Phase Warning Banner */}
        {!isOpenBooking && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-200 rounded-2xl shadow-sm p-4 sm:p-5 flex items-start gap-3">
            <div className="p-2 bg-amber-600 rounded-xl text-white flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Booking is currently closed.</p>
              <p className="text-sm text-amber-700 mt-0.5">
                You can browse the catalog, but you cannot secure a room at this time.
              </p>
            </div>
          </div>
        )}

        {roomsError ? (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Couldn&apos;t load rooms</p>
              <p className="text-sm text-red-700 mt-0.5">{roomsError.message}</p>
            </div>
          </div>
        ) : roomList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-slate-50 rounded-full mb-3">
              <BedDouble className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">No rooms found.</p>
            <p className="text-xs text-slate-500 mt-1">Check back once the catalog has been set up.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {roomList.map((room) => {
              const isSoldOut = room.available_beds <= 0
              const canBook = isOpenBooking && !isSoldOut
              const coverImage = imagesByRoomId.get(room.room_id)?.[0]

              return (
                <div
                  key={room.room_id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col"
                >
                  {coverImage && (
                    <div className="relative w-full h-40 bg-slate-100">
                      <NextImage
                        src={`${coverImage}?tr=w-500,f-auto`}
                        alt={`Room ${room.room_number}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          Block {room.block}, Room {room.room_number}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{formatTier(room.tier)}</p>
                      </div>
                      {isSoldOut ? (
                        <span className="inline-flex items-center flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Sold Out
                        </span>
                      ) : (
                        <span className="inline-flex items-center flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {room.available_beds} {room.available_beds === 1 ? 'Bed' : 'Beds'} Available
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(room.price_per_academic_year)}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <BedDouble className="w-3.5 h-3.5" />
                        Floor {room.floor}
                      </span>
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    {canBook && !user ? (
                      <Link
                        href={`/login?next=/rooms/${room.room_id}/book`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <LogIn className="w-4 h-4" />
                        Sign In to Book
                      </Link>
                    ) : canBook ? (
                      <Link
                        href={`/rooms/${room.room_id}/book`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        Book Room
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-400 py-2.5 px-4 rounded-lg text-sm font-semibold cursor-not-allowed"
                      >
                        {isSoldOut ? 'Sold Out' : 'Booking Closed'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}