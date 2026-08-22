import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Ticket, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react'

// Status configuration for better maintainability
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
} as const

type TicketStatus = keyof typeof STATUS_CONFIG

interface Ticket {
  id: string
  title: string
  description: string | null
  status: TicketStatus
  category: string
  image_url: string | null
  created_at: string
  student_id: string
}

export default async function TicketsDashboard() {
  const supabase = await createClient()

  // 1. Secure the route and get the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch only THIS student's tickets
  const { data: tickets, error } = await supabase
    .from('maintenance_tickets')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
  }

  const ticketsCount = tickets?.length || 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Ticket className="w-8 h-8 text-indigo-600" />
            My Tickets
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {ticketsCount === 0 
              ? "You haven't reported any issues yet" 
              : `${ticketsCount} ticket${ticketsCount > 1 ? 's' : ''} reported`
            }
          </p>
        </div>
        <Link
          href="/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </Link>
      </div>

      {/* Empty State */}
      {!tickets || tickets.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <Ticket className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No issues reported yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Have a maintenance issue? Report it now and we'll get it resolved quickly.
          </p>
          <Link
            href="/tickets/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Report an Issue
          </Link>
        </div>
      ) : (
        /* Ticket List */
        <div className="space-y-4">
          {tickets.map((ticket: Ticket) => {
            const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
            const StatusIcon = status.icon

            return (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="block bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 group"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Image Thumbnail */}
                  {ticket.image_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={`${ticket.image_url}?tr=w-200,h-200,c-at_max`}
                        alt="Issue thumbnail"
                        className="w-full md:w-24 h-48 md:h-24 object-cover rounded-lg border border-slate-100"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Ticket Details */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 line-clamp-1">
                        {ticket.title}
                      </h2>

                      {/* Status Badge */}
                      <span
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border tracking-wide ${status.className}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>

                    {ticket.description && (
                      <p className="text-slate-600 text-sm mt-1.5 line-clamp-2">
                        {ticket.description}
                      </p>
                    )}

                    {/* Footer Meta Data */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500 font-medium">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-md capitalize">
                        {ticket.category.replace('_', ' ')}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400">
                        {new Date(ticket.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Arrow indicator for clickable cards */}
                  <div className="hidden md:flex items-center text-slate-300 group-hover:text-indigo-500 transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}