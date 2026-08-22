'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import supabase from '@/lib/supabase/client'
import SignOutButton from '@/components/SignOutButton'
import {
  KeyRound,
  Home,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  DoorOpen,
  CalendarDays,
  Clock,
} from 'lucide-react'

type BookingPhase = 'closed' | 'retention_only' | 'open_booking'
type AllocationStatus = 'retention_requested' | 'reserved' | 'confirmed' | 'rejected'

interface RoomDetails {
  id: string
  room_number: string
  block: string
  floor: number
}

interface PageState {
  loading: boolean
  loadError: string | null
  userId: string | null
  bookingPhase: BookingPhase | null
  academicYear: string | null
  room: RoomDetails | null
  existingAllocation: { status: AllocationStatus } | null
}

export default function RetentionPage() {
  const [state, setState] = useState<PageState>({
    loading: true,
    loadError: null,
    userId: null,
    bookingPhase: null,
    academicYear: null,
    room: null,
    existingAllocation: null,
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setState((s) => ({ ...s, loading: true, loadError: null }))

      // 1. Current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (userError || !user) {
        setState((s) => ({ ...s, loading: false, loadError: 'You must be signed in to view this page.' }))
        return
      }

      // 2. Global booking phase + academic year
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('current_booking_phase, active_academic_year')
        .eq('id', 1)
        .maybeSingle()

      if (cancelled) return

      if (settingsError) {
        setState((s) => ({
          ...s,
          loading: false,
          loadError: settingsError.message,
        }))
        return
      }

      if (!settings) {
        setState((s) => ({
          ...s,
          loading: false,
          loadError: 'Settings row missing. Go to Supabase and ensure system_settings has a row where id = 1.',
        }))
        return
      }

      // 3. Profile + assigned room (join)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('room_id, rooms(id, room_number, block, floor)')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (profileError) {
        setState((s) => ({
          ...s,
          loading: false,
          loadError: profileError.message,
        }))
        return
      }

      if (!profile) {
        setState((s) => ({
          ...s,
          loading: false,
          loadError: 'Profile not found. This user does not have a row in the profiles table.',
        }))
        return
      }

      const room = (profile.rooms as unknown as RoomDetails | null) ?? null
      const academicYear = settings.active_academic_year as string

      // 4. Existing allocation for the active academic year, if any
      let existingAllocation: { status: AllocationStatus } | null = null
      if (room) {
        const { data: allocation, error: allocationError } = await supabase
          .from('room_allocations')
          .select('status')
          .eq('student_id', user.id)
          .eq('academic_year', academicYear)
          .maybeSingle()

        if (cancelled) return

        if (allocationError) {
          setState((s) => ({ ...s, loading: false, loadError: allocationError.message }))
          return
        }

        existingAllocation = allocation as { status: AllocationStatus } | null
      }

      setState({
        loading: false,
        loadError: null,
        userId: user.id,
        bookingPhase: settings.current_booking_phase as BookingPhase,
        academicYear,
        room,
        existingAllocation,
      })
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleRetain() {
    if (!state.userId || !state.room || !state.academicYear) return

    setSubmitting(true)
    setSubmitError(null)

    const { data, error } = await supabase
      .from('room_allocations')
      .insert({
        room_id: state.room.id,
        student_id: state.userId,
        academic_year: state.academicYear,
        status: 'retention_requested',
        is_retention: true,
      })
      .select('status')
      .single()

    setSubmitting(false)

    if (error) {
      // Unique constraint on (student_id, academic_year) — most likely means
      // a request already exists but our earlier read raced with another
      // tab/session. Treat it as "already requested" rather than a hard error.
      if (error.code === '23505') {
        setState((s) => ({
          ...s,
          existingAllocation: { status: 'retention_requested' },
        }))
        return
      }
      setSubmitError(error.message)
      return
    }

    setState((s) => ({
      ...s,
      existingAllocation: data as { status: AllocationStatus },
    }))
  }

  const isRetentionOpen = state.bookingPhase === 'retention_only'
  const isEligible = !!state.room
  const alreadyRequested = !!state.existingAllocation

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Room Retention</h1>
                <p className="text-xs text-slate-500">Keep your current room next year</p>
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {state.loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : state.loadError ? (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Something went wrong</p>
              <p className="text-sm text-red-700 mt-0.5">{state.loadError}</p>
            </div>
          </div>
        ) : !isRetentionOpen ? (
          // 1. Phase check
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center">
            <div className="p-3 bg-slate-100 rounded-full mb-4">
              <Lock className="w-6 h-6 text-slate-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Room retention is currently closed</h2>
            <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
              Check back once the hostel opens the retention window for {state.academicYear ?? 'the next academic year'}.
            </p>
          </div>
        ) : !isEligible ? (
          // 2. Eligibility check
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center">
            <div className="p-3 bg-amber-50 rounded-full mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">You&apos;re not eligible for retention</h2>
            <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
              You don&apos;t currently have a room assigned to your profile, so there&apos;s nothing to retain.
              If this seems wrong, please contact hostel administration.
            </p>
          </div>
        ) : alreadyRequested ? (
          // 3. Already requested / confirmed
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-10 flex flex-col items-center text-center">
            <div className="p-3 bg-emerald-50 rounded-full mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              {state.existingAllocation?.status === 'confirmed'
                ? `Room ${state.room?.room_number} is confirmed`
                : `Retention request submitted`}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
              {state.existingAllocation?.status === 'confirmed'
                ? `Your room has been confirmed for ${state.academicYear}. No further action is needed.`
                : `Your retention request for Room ${state.room?.room_number} has been submitted and is pending admin approval.`}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Clock className="w-3.5 h-3.5" />
              Status: {state.existingAllocation?.status.replace('_', ' ')}
            </span>
          </div>
        ) : (
          // 4. Eligible and ready to request
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <DoorOpen className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Your Current Room</h3>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Room</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{state.room?.room_number}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Block {state.room?.block}, Floor {state.room?.floor}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Academic Year</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    {state.academicYear}
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{submitError}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleRetain}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-5 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 disabled:shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Retain Room {state.room?.room_number} for {state.academicYear}
                  </>
                )}
              </button>
              <p className="text-xs text-slate-400 text-center">
                An admin will review and confirm your request.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}