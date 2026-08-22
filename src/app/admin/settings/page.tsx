'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import supabase from '@/lib/supabase/client'
import SignOutButton from '@/components/SignOutButton'
import {
  Settings,
  Home,
  User,
  CalendarClock,
  Lock,
  Unlock,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react'

type BookingPhase = 'closed' | 'retention_only' | 'open_booking'

const PHASE_OPTIONS: { value: BookingPhase; label: string; description: string }[] = [
  {
    value: 'closed',
    label: 'Closed',
    description: 'No retention requests or bookings are accepted.',
  },
  {
    value: 'retention_only',
    label: 'Retention Phase',
    description: 'Current residents can request to keep their room.',
  },
  {
    value: 'open_booking',
    label: 'Open Booking',
    description: 'Public booking is live; vacancies are bookable by anyone.',
  },
]

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [phase, setPhase] = useState<BookingPhase>('closed')
  const [academicYear, setAcademicYear] = useState('')

  // Track the last-saved values so we can tell if anything actually changed
  const [initialPhase, setInitialPhase] = useState<BookingPhase>('closed')
  const [initialAcademicYear, setInitialAcademicYear] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      setLoading(true)
      setLoadError(null)

      const { data, error } = await supabase
        .from('system_settings')
        .select('current_booking_phase, active_academic_year')
        .eq('id', 1)
        .single()

      if (cancelled) return

      if (error || !data) {
        setLoadError(
          error?.message || 'Could not load settings. The system_settings row may be missing.'
        )
        setLoading(false)
        return
      }

      setPhase(data.current_booking_phase as BookingPhase)
      setAcademicYear(data.active_academic_year)
      setInitialPhase(data.current_booking_phase as BookingPhase)
      setInitialAcademicYear(data.active_academic_year)
      setLoading(false)
    }

    loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const hasChanges = phase !== initialPhase || academicYear.trim() !== initialAcademicYear

  async function handleSave() {
    const trimmedYear = academicYear.trim()

    if (!trimmedYear) {
      setMessage({ type: 'error', text: 'Academic year cannot be empty.' })
      return
    }

    setSaving(true)
    setMessage(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('system_settings')
      .update({
        current_booking_phase: phase,
        active_academic_year: trimmedYear,
        updated_by: user?.id ?? null,
      })
      .eq('id', 1)
      .select('current_booking_phase, active_academic_year')

    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    // RLS on system_settings only allows admins to update. A signed-in
    // non-admin (e.g. staff) would get a "successful" request that quietly
    // updates zero rows rather than an error -- check for that explicitly
    // so it doesn't look like a save that silently did nothing.
    if (!data || data.length === 0) {
      setMessage({
        type: 'error',
        text: "Update was blocked. Your account may not have admin permissions.",
      })
      return
    }

    setInitialPhase(phase)
    setInitialAcademicYear(trimmedYear)
    setMessage({ type: 'success', text: 'Settings saved successfully.' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md">
                  S
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Admin Settings
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Admin
                  </span>
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Settings className="w-3 h-3 text-amber-500" />
                  Booking Phase &amp; Academic Year
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-2">
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
              </nav>
              <div className="h-6 w-px bg-slate-200" />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            Global Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Changes here control what every resident and applicant sees across the portal.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Couldn&apos;t load settings</p>
              <p className="text-sm text-red-700 mt-0.5">{loadError}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <CalendarClock className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Room Allocation Controls</h3>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Booking Phase */}
              <div>
                <label
                  htmlFor="booking-phase"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Booking Phase
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {phase === 'closed' && <Lock className="h-4 w-4 text-slate-400" />}
                    {phase === 'retention_only' && <KeyRound className="h-4 w-4 text-slate-400" />}
                    {phase === 'open_booking' && <Unlock className="h-4 w-4 text-slate-400" />}
                  </div>
                  <select
                    id="booking-phase"
                    value={phase}
                    onChange={(e) => setPhase(e.target.value as BookingPhase)}
                    className="w-full appearance-none pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                  >
                    {PHASE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  {PHASE_OPTIONS.find((opt) => opt.value === phase)?.description}
                </p>
              </div>

              {/* Academic Year */}
              <div>
                <label
                  htmlFor="academic-year"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Active Academic Year
                </label>
                <input
                  id="academic-year"
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026/2027"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Format: YYYY/YYYY. This determines which allocations count toward vacancy totals.
                </p>
              </div>

              {/* Inline message */}
              {message && (
                <div
                  className={`rounded-lg border p-3 flex items-start gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <p
                    className={`text-sm ${
                      message.type === 'success' ? 'text-emerald-800' : 'text-red-800'
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              )}

              {/* Save button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                {hasChanges && !saving && (
                  <span className="text-xs text-slate-500">Unsaved changes</span>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white py-2.5 px-5 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 disabled:shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}