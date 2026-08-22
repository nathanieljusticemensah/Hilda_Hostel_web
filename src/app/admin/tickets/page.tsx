"use client"

import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabase/client'
import NextImage from 'next/image'
import { 
  ClipboardList, 
  Search, 
  Filter, 
  ChevronDown,
  User,
  Home,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  RefreshCw,
  Loader2,
  ImageOff
} from 'lucide-react'

// Define the shape of our joined data
type TicketWithDetails = {
  id: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  image_url: string | null
  created_at: string
  profiles: {
    full_name: string
    phone_number: string
  } | null
  rooms: {
    room_number: string
  } | null
}

// Status configuration
const STATUS_CONFIG = {
  open: {
    label: 'Open',
    icon: AlertCircle,
    className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    dotColor: 'bg-amber-400'
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    className: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
    dotColor: 'bg-sky-400'
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    dotColor: 'bg-emerald-400'
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    dotColor: 'bg-red-400'
  }
} as const

type StatusKey = keyof typeof STATUS_CONFIG

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketWithDetails[]>([])
  const [filteredTickets, setFilteredTickets] = useState<TicketWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    filterTickets()
  }, [tickets, searchTerm, statusFilter, categoryFilter])

  async function fetchTickets() {
    try {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select(`
          *,
          profiles(full_name, phone_number),
          rooms(room_number)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(data as any)
    } catch (err) {
      console.error('Error fetching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  function filterTickets() {
    let filtered = [...tickets]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.rooms?.room_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === categoryFilter)
    }

    setFilteredTickets(filtered)
  }

  async function handleStatusChange(ticketId: string, newStatus: string) {
    setUpdatingId(ticketId)
    try {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId)

      if (error) throw error

      // Optimistically update the UI
      setTickets((prev) =>
        prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t)
      )
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function refreshTickets() {
    setLoading(true)
    await fetchTickets()
  }

  // Get unique categories for filter
  const categories = Array.from(new Set(tickets.map(t => t.category)))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/60">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <ClipboardList className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Maintenance Queue</h1>
                <p className="text-sm text-slate-500">
                  {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshTickets}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <div className="h-6 w-px bg-slate-200" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">Live</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tickets by title, student, or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ticket List */}
        {filteredTickets.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-slate-100 rounded-full">
                <ClipboardList className="w-8 h-8 text-slate-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {tickets.length === 0 ? 'No tickets submitted yet' : 'No matching tickets'}
            </h3>
            <p className="text-sm text-slate-500">
              {tickets.length === 0 
                ? 'Maintenance tickets will appear here once students submit them.'
                : 'Try adjusting your filters to see more results.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const status = STATUS_CONFIG[ticket.status as StatusKey] || STATUS_CONFIG.open
              const StatusIcon = status.icon

              return (
                <div 
                  key={ticket.id} 
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex flex-col lg:flex-row gap-5">
                    {/* Photo Thumbnail */}
                    {ticket.image_url ? (
                      <div className="flex-shrink-0 w-full lg:w-40 h-48 lg:h-40 relative rounded-lg overflow-hidden border border-slate-200">
                        <NextImage 
                          src={ticket.image_url}
                          alt="Issue"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-full lg:w-40 h-32 lg:h-40 bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <ImageOff className="w-8 h-8 opacity-40" />
                        <span className="text-xs mt-1">No Photo</span>
                      </div>
                    )}

                    {/* Ticket Details */}
                    <div className="flex-grow min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-slate-900 leading-tight truncate">
                            {ticket.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-medium text-slate-600">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                              <Home className="w-3 h-3" />
                              Room {ticket.rooms?.room_number || 'Unassigned'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg capitalize">
                              {ticket.category.replace('_', ' ')}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {ticket.profiles?.full_name || 'Unknown Student'}
                            </span>
                            {ticket.profiles?.phone_number && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-400">{ticket.profiles.phone_number}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Dropdown */}
                        <div className="flex-shrink-0">
                          <select
                            disabled={updatingId === ticket.id}
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                            className={`block w-full sm:w-auto rounded-lg border-2 text-sm font-semibold px-3 py-1.5 focus:ring-0 cursor-pointer transition-colors duration-200 ${status.className}`}
                          >
                            <option value="open">OPEN</option>
                            <option value="in_progress">IN PROGRESS</option>
                            <option value="resolved">RESOLVED</option>
                            <option value="cancelled">CANCELLED</option>
                          </select>
                          {updatingId === ticket.id && (
                            <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Updating...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {ticket.description && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">
                            {ticket.description}
                          </p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                          <div className={`h-1.5 w-1.5 rounded-full ${status.dotColor}`} />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}