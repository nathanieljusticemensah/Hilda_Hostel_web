"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import supabase from '@/lib/supabase/client'
import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ImageOff,
} from 'lucide-react'

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    icon: AlertCircle,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
} as const

type TicketStatus = keyof typeof STATUS_CONFIG

type TicketDetail = {
  id: string
  title: string
  description: string | null
  category: string
  status: TicketStatus
  image_url: string | null
  resolution_note: string | null
  created_at: string
  resolved_at: string | null
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        router.replace('/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('maintenance_tickets')
        .select('id, title, description, category, status, image_url, resolution_note, created_at, resolved_at')
        .eq('id', params.id)
        .eq('student_id', userData.user.id)
        .single()

      if (!mounted) return

      if (fetchError || !data) {
        setNotFound(true)
      } else {
        setTicket(data as TicketDetail)
      }
      setLoading(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [params.id, router])

  async function handleCancel() {
    if (!ticket) return
    setCancelling(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('maintenance_tickets')
        .update({ status: 'cancelled' })
        .eq('id', ticket.id)

      if (updateError) throw updateError
      setTicket({ ...ticket, status: 'cancelled' })
    } catch (err) {
      console.error('Failed to cancel ticket', err)
      setError('Failed to cancel ticket. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="ml-3 text-slate-600">Loading ticket...</span>
        </div>
      </div>
    )
  }

  if (notFound || !ticket) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-slate-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Ticket not found</h1>
        <p className="text-slate-500 mb-6">
          This ticket doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </Link>
      </div>
    )
  }

  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
  const StatusIcon = status.icon

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors duration-200 mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
        Back to Tickets
      </Link>

      <div className="surface-card rounded-2xl overflow-hidden">
        {ticket.image_url ? (
          <div className="relative w-full h-56 sm:h-72 bg-slate-100">
            <NextImage src={`${ticket.image_url}?tr=w-800,f-auto`} alt="Issue" fill className="object-cover" />
          </div>
        ) : (
          <div className="w-full h-32 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
            <ImageOff className="w-8 h-8 opacity-40" />
            <span className="text-xs mt-1">No photo attached</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-slate-900">{ticket.title}</h1>
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border tracking-wide ${status.className}`}
            >
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="px-2.5 py-1 bg-slate-100 rounded-md capitalize">
              {ticket.category.replace('_', ' ')}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(ticket.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {ticket.description && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-1.5">Description</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg p-3">
                {ticket.description}
              </p>
            </div>
          )}

          {ticket.status === 'resolved' && ticket.resolution_note && (
            <div>
              <h2 className="text-sm font-semibold text-emerald-700 mb-1.5">Resolution Note</h2>
              <p className="text-sm text-emerald-800 whitespace-pre-wrap bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                {ticket.resolution_note}
              </p>
              {ticket.resolved_at && (
                <p className="text-xs text-slate-400 mt-1.5">
                  Resolved on{' '}
                  {new Date(ticket.resolved_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {ticket.status === 'open' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancel Ticket
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
