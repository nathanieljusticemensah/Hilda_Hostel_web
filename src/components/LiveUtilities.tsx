"use client"

import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabase/client'
import { Droplet, Zap, Loader2 } from 'lucide-react'

type UtilityRow = {
  id: string
  type?: 'water' | 'power'
  name?: string
  status: string
  schedule_note?: string | null
  estimated_end_time?: string | null
  updated_at?: string
}

const CACHE_KEY = 'hilda:utilities:cache'

// Status options per utility type. Value = what's stored in the DB,
// tone drives the color dot. Keep this in sync with STATUS_TONE below.
const STATUS_OPTIONS: Record<string, { value: string; label: string; tone: 'good' | 'warn' | 'bad' }[]> = {
  water: [
    { value: 'flowing', label: 'Flowing', tone: 'good' },
    { value: 'low_pressure', label: 'Low Pressure', tone: 'warn' },
    { value: 'dry', label: 'Dry', tone: 'bad' },
  ],
  power: [
    { value: 'grid', label: 'On Grid', tone: 'good' },
    { value: 'generator', label: 'Generator', tone: 'warn' },
    { value: 'outage', label: 'Outage', tone: 'bad' },
  ],
}

function statusTone(u: UtilityRow): 'good' | 'warn' | 'bad' {
  const type = u.type || ''
  const match = STATUS_OPTIONS[type]?.find((o) => o.value === u.status)
  if (match) return match.tone
  // Fallback for legacy/unrecognized status strings
  if (u.status === 'stable' || u.status === 'grid' || u.status === 'flowing') return 'good'
  if (u.status === 'dry' || u.status === 'unavailable' || u.status === 'outage') return 'bad'
  return 'warn'
}

const TONE_DOT: Record<string, string> = {
  good: 'bg-green-500',
  warn: 'bg-yellow-500',
  bad: 'bg-red-500',
}

export default function LiveUtilities({ canToggle = false }: { canToggle?: boolean }) {
  const [utilities, setUtilities] = useState<Record<string, UtilityRow>>({})
  const [online, setOnline] = useState<boolean>(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [draftEndTime, setDraftEndTime] = useState<Record<string, string>>({})

  // load cache first for offline tolerance
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) setUtilities(JSON.parse(raw))
    } catch (e) {
      console.warn('Failed to read utilities cache', e)
    }
  }, [])

  // persist cache whenever utilities change
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(utilities))
    } catch (e) {
      console.warn('Failed to write utilities cache', e)
    }
  }, [utilities])

  useEffect(() => {
    let mounted = true

    async function fetchInitial() {
      const { data, error } = await supabase.from('utilities').select('*')
      if (error) {
        console.error('Failed to load utilities', error)
        return
      }
      if (!mounted || !data) return
      const map: Record<string, UtilityRow> = {}
      for (const row of data) {
        const key = (row.type as string) || (row.name as string) || row.id
        map[key] = row as UtilityRow
      }
      setUtilities(map)
    }

    fetchInitial()

    if (canToggle) {
      supabase.auth.getUser().then(({ data }) => {
        if (mounted) setUserId(data?.user?.id ?? null)
      })
    }

    const channel = supabase
      .channel('public:utilities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'utilities' },
        (payload) => {
          const newRow = payload.new as UtilityRow
          if (!newRow) return
          const key = newRow.type || newRow.name || newRow.id
          setUtilities((prev) => ({ ...prev, [key]: newRow }))
        }
      )
      .subscribe()

    return () => {
      mounted = false
      try {
        // @ts-ignore
        channel.unsubscribe()
      } catch (e) {
        console.warn('Failed to unsubscribe supabase channel', e)
      }
    }
  }, [canToggle])

  // separate effect for online/offline to avoid hydration mismatch
  useEffect(() => {
    const setInitial = () => setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    setInitial()
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function handleStatusChange(key: string, u: UtilityRow, newStatus: string) {
    setSavingKey(key)
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
        updated_by: userId,
      }
      // Only "generator" carries a meaningful countdown; clear it otherwise
      // so a stale timer doesn't linger once power is back on the grid.
      if (newStatus === 'generator') {
        const draft = draftEndTime[key]
        payload.estimated_end_time = draft ? new Date(draft).toISOString() : null
      } else {
        payload.estimated_end_time = null
      }

      const { error } = await supabase
        .from('utilities')
        .update(payload)
        .eq('id', u.id)

      if (error) throw error
      // Realtime subscription will also push this, but update optimistically
      // so staff on a slow connection see immediate feedback.
      setUtilities((prev) => ({ ...prev, [key]: { ...prev[key], ...payload, status: newStatus } as UtilityRow }))
    } catch (e) {
      console.error('Failed to update utility status', e)
      alert('Failed to update status. Please try again.')
    } finally {
      setSavingKey(null)
    }
  }

  const renderUtility = (key: string, u: UtilityRow) => {
    const typeKey = u.type || (u.name || '').toString()
    const formatted = typeKey ? `${typeKey.charAt(0).toUpperCase()}${typeKey.slice(1).toLowerCase()}` : u.id
    const Icon = u.type === 'power' ? Zap : u.type === 'water' ? Droplet : null
    const tone = statusTone(u)
    const options = STATUS_OPTIONS[typeKey] || []
    const isSaving = savingKey === key

    return (
      <div key={key} className="border rounded-md p-3 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon ? <Icon className="h-5 w-5 text-slate-600" /> : null}
            <div>
              <div className="text-sm font-medium">{formatted}</div>
              {u.estimated_end_time ? (
                <div className="text-xs text-muted-foreground">Ends at: {new Date(u.estimated_end_time).toLocaleString()}</div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${TONE_DOT[tone]}`} />
            <div className="text-sm capitalize font-medium">{u.status?.replace('_', ' ')}</div>
          </div>
        </div>

        {canToggle && options.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
            <select
              disabled={isSaving}
              value={u.status}
              onChange={(e) => handleStatusChange(key, u, e.target.value)}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {u.status === 'generator' && (
              <>
                <input
                  type="datetime-local"
                  disabled={isSaving}
                  onChange={(e) => setDraftEndTime((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="min-h-[44px] rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={isSaving || !draftEndTime[key]}
                  onClick={() => handleStatusChange(key, u, 'generator')}
                  className="min-h-[44px] px-3 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                >
                  Set countdown
                </button>
              </>
            )}

            {isSaving && <Loader2 className="h-5 w-5 animate-spin text-indigo-600 self-center" />}
          </div>
        )}
      </div>
    )
  }

  const keys = Object.keys(utilities)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Live Utilities</h3>
        {!online ? <span className="text-xs text-yellow-600">Offline (cached)</span> : <span className="text-xs text-green-600">Live</span>}
      </div>

      {keys.length === 0 ? (
        <div className="text-sm text-muted-foreground">No utilities available</div>
      ) : (
        <div className="grid gap-2">{keys.map((k) => renderUtility(k, utilities[k]))}</div>
      )}
    </div>
  )
}
