"use client"

import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabase/client'
import { Droplet, Zap } from 'lucide-react'

type UtilityRow = {
  id: string
  type?: string
  name?: string
  status: boolean
  estimated_end_time?: string | null
  updated_at?: string
}

const CACHE_KEY = 'hilda:utilities:cache'

export default function LiveUtilities({ canToggle = false }: { canToggle?: boolean }) {
  const [utilities, setUtilities] = useState<Record<string, UtilityRow>>({})
  // initialize to true so SSR matches the initial client render and avoids hydration mismatch
  const [online, setOnline] = useState<boolean>(true)

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
        const key = (row.name as string) || row.id
        map[key] = row as UtilityRow
      }
      setUtilities(map)
    }

    fetchInitial()

    const channel = supabase
      .channel('public:utilities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'utilities' },
        (payload) => {
          const newRow = payload.new as UtilityRow
          if (!newRow) return
          const key = newRow.name || newRow.id
          setUtilities((prev) => ({ ...prev, [key]: newRow }))
        }
      )
      .subscribe()

    return () => {
      mounted = false
      try {
        // unsubscribe from realtime
        // channel.unsubscribe() returns a promise in some supabase versions; ignore the result
        // @ts-ignore
        channel.unsubscribe()
      } catch (e) {
        console.warn('Failed to unsubscribe supabase channel', e)
      }
    }
  }, [])

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

  async function toggleUtility(key: string) {
    const row = utilities[key]
    if (!row) return
    // optimistic update
    setUtilities((prev) => ({ ...prev, [key]: { ...row, status: !row.status } }))

    try {
      const { error } = await supabase.from('utilities').update({ status: !row.status }).eq('id', row.id)
      if (error) {
        console.error('Failed to update utility', error)
        // revert
        setUtilities((prev) => ({ ...prev, [key]: row }))
      }
    } catch (e) {
      console.error(e)
      setUtilities((prev) => ({ ...prev, [key]: row }))
    }
  }

  const renderUtility = (key: string, u: UtilityRow) => {
    const typeKey = (u.type || u.name || '').toString()
    const formatted = typeKey ? `${typeKey.charAt(0).toUpperCase()}${typeKey.slice(1).toLowerCase()}` : u.id
    const Icon = typeKey.toLowerCase().includes('water') || typeKey.toLowerCase().includes('drop') ? Droplet : typeKey.toLowerCase().includes('power') || typeKey.toLowerCase().includes('zap') ? Zap : null

    return (
      <div key={key} className="flex items-center justify-between gap-4 p-3 border rounded-md">
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
          <div className={`h-3 w-3 rounded-full ${u.status ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="text-sm">{u.status ? 'ON' : 'OFF'}</div>
          {canToggle ? (
            <button
              className="ml-2 rounded bg-blue-600 px-2 py-1 text-xs text-white"
              onClick={() => toggleUtility(key)}
            >
              Toggle
            </button>
          ) : null}
        </div>
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
