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
  XCircle,
  Phone,
  DoorOpen,
  CalendarDays,
  Inbox,
  Megaphone,
  Building2,
} from 'lucide-react'

interface RetentionRequest {
  id: string
  academic_year: string
  status: string
  student_id: string
  profiles: {
    full_name: string
    phone_number: string | null
  } | null
  rooms: {
    room_number: string
    block: string
  } | null
}

export default function RetentionsQueuePage() {
  const [requests, setRequests] = useState<RetentionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Track which row + action is in flight so only that row's buttons disable
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRequests() {
      setLoading(true)
      setLoadError(null)

      const { data, error } = await supabase
        .from('room_allocations')
        .select('id, academic_year, status, student_id, profiles(full_name, phone_number), rooms(room_number, block)')
        .eq('status', 'retention_requested')
        .eq('is_retention', true)
        .order('created_at', { ascending: true })

      if (cancelled) return

      if (error) {
        setLoadError(error.message)
        setLoading(false)
        return
      }

      setRequests((data ?? []) as unknown as RetentionRequest[])
      setLoading(false)
    }

    loadRequests()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleApprove(id: string) {
    setActioningId(`${id}:confirmed`)
    setRowError(null)

    const { data, error } = await supabase
      .from('room_allocations')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select('id')

    setActioningId(null)

    if (error) {
      setRowError({ id, text: error.message })
      return
    }

    if (!data || data.length === 0) {
      setRowError({ id, text: 'Update was blocked. You may not have permission.' })
      return
    }

    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleReject(request: RetentionRequest) {
    const { id, student_id } = request
    setActioningId(`${id}:rejected`)
    setRowError(null)

    // Atomic on the DB side: rejects the allocation AND clears the
    // student's room_id in one transaction. No more partial-failure
    // case to handle here -- either both happen, or neither does.
    const { error } = await supabase.rpc('process_retention_rejection', {
      p_allocation_id: id,
      p_student_id: student_id,
    })

    setActioningId(null)

    if (error) {
      setRowError({ id, text: error.message })
      return
    }

    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleDecision(id: string, decision: 'confirmed' | 'rejected') {
    if (decision === 'confirmed') {
      handleApprove(id)
      return
    }
    const request = requests.find((r) => r.id === id)
    if (!request) return
    handleReject(request)
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
                  Retention Queue
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Admin
                  </span>
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3 text-amber-500" />
                  Room Retention Approvals
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
                  href="/admin/rooms"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Rooms</span>
                </Link>
                <Link
                  href="/admin/announcements"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  <Megaphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Announcements</span>
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
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-indigo-600" />
              Pending Retention Requests
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Resolve these before switching to Open Booking, or held rooms won&apos;t count against vacancies.
            </p>
          </div>
          {!loading && !loadError && requests.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-xs font-medium text-amber-700">
                {requests.length} pending
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Couldn&apos;t load requests</p>
              <p className="text-sm text-red-700 mt-0.5">{loadError}</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-slate-50 rounded-full mb-3">
              <Inbox className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              No pending retention requests at this time.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              New requests will show up here as residents submit them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const approveKey = `${request.id}:confirmed`
              const rejectKey = `${request.id}:rejected`
              const isApproving = actioningId === approveKey
              const isRejecting = actioningId === rejectKey
              const isBusy = isApproving || isRejecting

              return (
                <div
                  key={request.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Requester + details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                          {(request.profiles?.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {request.profiles?.full_name || 'Unknown resident'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {request.profiles?.phone_number || 'No phone on file'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                          Room{' '}
                          <span className="font-medium text-slate-900">
                            {request.rooms
                              ? `${request.rooms.room_number} (Block ${request.rooms.block})`
                              : 'Unknown room'}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          {request.academic_year}
                        </span>
                      </div>

                      {rowError?.id === request.id && (
                        <div className="mt-3 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          {rowError.text}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDecision(request.id, 'rejected')}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRejecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {isRejecting ? 'Rejecting...' : 'Reject'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(request.id, 'confirmed')}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isApproving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {isApproving ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
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