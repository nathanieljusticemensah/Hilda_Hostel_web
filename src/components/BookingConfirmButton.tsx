'use client'

import { useState } from 'react'
import Link from 'next/link'
import supabase from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle, KeyRound, ArrowRight } from 'lucide-react'

interface BookingConfirmButtonProps {
  roomId: string
  academicYear: string
  roomLabel: string
}

export default function BookingConfirmButton({
  roomId,
  academicYear,
  roomLabel,
}: BookingConfirmButtonProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)

    // CRITICAL: never insert into room_allocations directly here. book_room()
    // locks the room row (SELECT ... FOR UPDATE) for the duration of the
    // transaction, which is what actually prevents two students both
    // claiming the last bed. A plain insert from the client would bypass
    // that lock entirely and reopen the exact race condition it exists to
    // close.
    const { error: rpcError } = await supabase.rpc('book_room', {
      p_room_id: roomId,
      p_academic_year: academicYear,
    })

    setSubmitting(false)

    if (rpcError) {
      // book_room() surfaces specific, human-readable messages via
      // RAISE EXCEPTION ('Booking is not currently open...', 'Room is
      // fully booked', 'Room not found or inactive') -- pass those
      // through as-is rather than a generic failure string.
      setError(rpcError.message)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex flex-col items-center text-center">
        <div className="p-2.5 bg-emerald-600 rounded-full text-white mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-emerald-800">Booking confirmed!</p>
        <p className="text-xs text-emerald-700 mt-1">
          {roomLabel} is now yours for {academicYear}.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-1.5 bg-emerald-600 text-white py-2.5 px-5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all duration-200 shadow-sm"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 px-5 rounded-lg text-base font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 disabled:shadow-sm"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Confirming...
          </>
        ) : (
          <>
            <KeyRound className="w-5 h-5" />
            Confirm Booking
          </>
        )}
      </button>
    </div>
  )
}