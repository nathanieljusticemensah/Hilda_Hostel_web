"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import supabase from '@/lib/supabase/client'
import SignOutButton from '@/components/SignOutButton'
import {
  Building2,
  Home,
  User,
  Megaphone,
  Pencil,
  Upload,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Power,
} from 'lucide-react'

type Room = {
  id: string
  room_number: string
  block: string
  floor: number
  tier: string
  capacity: number
  price_per_academic_year: number
  images: string[]
  is_active: boolean
}

const TIER_OPTIONS = ['1_in_room', '2_in_room', '3_in_room', '4_in_room']

function formatTier(tier: string): string {
  const match = tier.match(/^(\d+)_in_room$/)
  return match ? `${match[1]} in a Room` : tier.replace(/_/g, ' ')
}

const EMPTY_FORM = {
  room_number: '',
  block: '',
  floor: '1',
  tier: TIER_OPTIONS[0],
  capacity: '1',
  price_per_academic_year: '',
  is_active: true,
}

async function uploadToImageKit(file: File) {
  const authRes = await fetch('/api/imagekit-auth')
  if (!authRes.ok) throw new Error('ImageKit auth failed')
  const auth = await authRes.json()

  const form = new FormData()
  form.append('file', file)
  form.append('fileName', file.name)
  form.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '')
  form.append('signature', auth.signature)
  form.append('token', auth.token)
  form.append('expire', String(auth.expire))
  form.append('folder', '/Hilda_Hostel/rooms')

  const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: form,
  })

  const data = await uploadRes.json()
  if (!uploadRes.ok) throw new Error(data.message || 'Upload failed')
  return { url: data.url as string }
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [images, setImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchRooms()
  }, [])

  async function fetchRooms() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rooms')
      .select('id, room_number, block, floor, tier, capacity, price_per_academic_year, images, is_active')
      .order('block', { ascending: true })
      .order('room_number', { ascending: true })

    if (error) {
      setLoadError(error.message)
    } else {
      setRooms((data ?? []) as Room[])
      setLoadError(null)
    }
    setLoading(false)
  }

  function startEdit(room: Room) {
    setEditingId(room.id)
    setForm({
      room_number: room.room_number,
      block: room.block,
      floor: String(room.floor),
      tier: room.tier,
      capacity: String(room.capacity),
      price_per_academic_year: String(room.price_per_academic_year),
      is_active: room.is_active,
    })
    setImages(room.images ?? [])
    setMessage(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setImages([])
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingImage(true)
    setMessage(null)
    try {
      const { url } = await uploadToImageKit(file)
      setImages((prev) => [...prev, url])
    } catch (err) {
      console.error('Failed to upload room photo', err)
      setMessage({ type: 'error', text: 'Photo upload failed. Please try again.' })
    } finally {
      setUploadingImage(false)
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const floor = Number(form.floor)
    const capacity = Number(form.capacity)
    const price = Number(form.price_per_academic_year)

    if (!form.room_number.trim() || !form.block.trim()) {
      setMessage({ type: 'error', text: 'Room number and block are required.' })
      return
    }
    if (!Number.isFinite(floor) || !Number.isFinite(capacity) || capacity < 1 || !Number.isFinite(price) || price < 0) {
      setMessage({ type: 'error', text: 'Floor, capacity, and price must be valid numbers.' })
      return
    }

    setSaving(true)
    setMessage(null)

    const payload = {
      room_number: form.room_number.trim(),
      block: form.block.trim(),
      floor,
      tier: form.tier,
      capacity,
      price_per_academic_year: price,
      images,
      is_active: form.is_active,
    }

    if (editingId) {
      const { data, error } = await supabase
        .from('rooms')
        .update(payload)
        .eq('id', editingId)
        .select('id')

      setSaving(false)

      if (error) {
        setMessage({ type: 'error', text: error.message })
        return
      }
      if (!data || data.length === 0) {
        setMessage({
          type: 'error',
          text: 'Update was blocked. Only admin accounts can manage room inventory.',
        })
        return
      }
      setMessage({ type: 'success', text: 'Room updated.' })
    } else {
      const { error } = await supabase.from('rooms').insert(payload)
      setSaving(false)

      if (error) {
        setMessage({ type: 'error', text: error.message })
        return
      }
      setMessage({ type: 'success', text: 'Room created.' })
    }

    cancelEdit()
    await fetchRooms()
  }

  async function toggleActive(room: Room) {
    const { data, error } = await supabase
      .from('rooms')
      .update({ is_active: !room.is_active })
      .eq('id', room.id)
      .select('id')

    if (error || !data || data.length === 0) {
      setMessage({ type: 'error', text: 'Failed to update room status.' })
      return
    }
    await fetchRooms()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Room Inventory</h1>
                <p className="text-xs text-slate-500">Manage rooms, pricing, and gallery photos</p>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Composer */}
        <form onSubmit={handleSubmit} className="surface-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              {editingId ? `Edit Room ${form.room_number}` : 'Add New Room'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="room_number" className="block text-sm font-medium text-slate-700 mb-1.5">
                Room Number
              </label>
              <input
                id="room_number"
                type="text"
                value={form.room_number}
                onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                placeholder="A101"
              />
            </div>
            <div>
              <label htmlFor="block" className="block text-sm font-medium text-slate-700 mb-1.5">
                Block
              </label>
              <input
                id="block"
                type="text"
                value={form.block}
                onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                placeholder="A"
              />
            </div>
            <div>
              <label htmlFor="floor" className="block text-sm font-medium text-slate-700 mb-1.5">
                Floor
              </label>
              <input
                id="floor"
                type="number"
                value={form.floor}
                onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
              />
            </div>
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-slate-700 mb-1.5">
                Capacity
              </label>
              <input
                id="capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tier" className="block text-sm font-medium text-slate-700 mb-1.5">
                Tier
              </label>
              <select
                id="tier"
                value={form.tier}
                onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {formatTier(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1.5">
                Price / Academic Year (GH₵)
              </label>
              <input
                id="price"
                type="number"
                min={0}
                step="0.01"
                value={form.price_per_academic_year}
                onChange={(e) => setForm((f) => ({ ...f, price_per_academic_year: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                placeholder="4500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Gallery Photos <span className="text-slate-400 text-xs font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {images.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group">
                  <NextImage src={`${url}?tr=w-160,h-160,c-at_max`} alt="" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-300 flex items-center justify-center cursor-pointer transition-colors duration-200">
                {uploadingImage ? (
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-slate-400" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Active (visible in public catalog)
          </label>

          {message && (
            <div
              className={`rounded-lg border p-3 flex items-start gap-2 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white py-2.5 px-5 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingId ? 'Save Changes' : 'Add Room'}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <div className="surface-card p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 text-sm text-red-700">
            {loadError}
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No rooms yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div key={room.id} className="surface-card p-4 flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                  {room.images?.[0] ? (
                    <NextImage src={`${room.images[0]}?tr=w-100,h-100,c-at_max`} alt="" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900 truncate">
                      Block {room.block}, Room {room.room_number}
                    </h3>
                    <span
                      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        room.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {room.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatTier(room.tier)} · Floor {room.floor} · Capacity {room.capacity} · GH₵{' '}
                    {room.price_per_academic_year.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(room)}
                    title={room.is_active ? 'Deactivate' : 'Activate'}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(room)}
                    title="Edit"
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
