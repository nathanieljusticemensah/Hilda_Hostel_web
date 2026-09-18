"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import supabase from '@/lib/supabase/client'
import SignOutButton from '@/components/SignOutButton'
import {
  Megaphone,
  Home,
  User,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
} from 'lucide-react'

type Announcement = {
  id: string
  title: string
  content: string
  category: string | null
  priority: string | null
  image_url: string | null
  is_pinned: boolean
  created_at: string
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'academic', label: 'Academic' },
  { value: 'social', label: 'Social' },
  { value: 'emergency_contact', label: 'Emergency Contact' },
]

const PRIORITY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
]

const EMPTY_FORM = {
  title: '',
  content: '',
  category: 'general',
  priority: 'general',
  is_pinned: false,
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
  form.append('folder', '/Hilda_Hostel/announcements')

  const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: form,
  })

  const data = await uploadRes.json()
  if (!uploadRes.ok) throw new Error(data.message || 'Upload failed')
  return { url: data.url as string }
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  async function fetchAnnouncements() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setAnnouncements((data ?? []) as Announcement[])
    }
    setLoading(false)
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id)
    setForm({
      title: a.title,
      content: a.content,
      category: a.category ?? 'general',
      priority: a.priority ?? 'general',
      is_pinned: a.is_pinned,
    })
    setExistingImageUrl(a.image_url)
    setImageFile(null)
    setMessage(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setExistingImageUrl(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setMessage({ type: 'error', text: 'Title and content are required.' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      let image_url = existingImageUrl
      if (imageFile) {
        const result = await uploadToImageKit(imageFile)
        image_url = result.url
      }

      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        priority: form.priority,
        is_pinned: form.is_pinned,
        image_url,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingId)
        if (updateError) throw updateError
        setMessage({ type: 'success', text: 'Announcement updated.' })
      } else {
        const { error: insertError } = await supabase.from('announcements').insert(payload)
        if (insertError) throw insertError
        setMessage({ type: 'success', text: 'Announcement posted.' })
      }

      cancelEdit()
      await fetchAnnouncements()
    } catch (err) {
      console.error('Failed to save announcement', err)
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save announcement.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function togglePin(a: Announcement) {
    const { error: updateError } = await supabase
      .from('announcements')
      .update({ is_pinned: !a.is_pinned })
      .eq('id', a.id)
    if (updateError) {
      setMessage({ type: 'error', text: 'Failed to update pin status.' })
      return
    }
    await fetchAnnouncements()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const { error: deleteError } = await supabase.from('announcements').delete().eq('id', id)
    setDeletingId(null)
    if (deleteError) {
      setMessage({ type: 'error', text: 'Failed to delete announcement.' })
      return
    }
    if (editingId === id) cancelEdit()
    await fetchAnnouncements()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Megaphone className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Announcements</h1>
                <p className="text-xs text-slate-500">Post and pin notices for residents</p>
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
              {editingId ? 'Edit Announcement' : 'New Announcement'}
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

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
              placeholder="e.g., Water tank cleaning on Saturday"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1.5">
              Content
            </label>
            <textarea
              id="content"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200 min-h-[120px] resize-y"
              placeholder="Details residents need to know..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1.5">
                Category
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-1.5">
                Priority
              </label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Photo <span className="text-slate-400 text-xs font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors duration-200">
                <Upload className="w-4 h-4" />
                {imageFile ? imageFile.name : existingImageUrl ? 'Replace photo' : 'Choose photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {existingImageUrl && !imageFile && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                  <NextImage src={`${existingImageUrl}?tr=w-100,h-100,c-at_max`} alt="" fill className="object-cover" />
                </div>
              )}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Pin to top
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
            {editingId ? 'Save Changes' : 'Post Announcement'}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <div className="surface-card p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 text-sm text-red-700">
            {error}
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="surface-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900 truncate">{a.title}</h3>
                    {a.is_pinned && <Pin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{a.content}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => togglePin(a)}
                    title={a.is_pinned ? 'Unpin' : 'Pin'}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                  >
                    {a.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => startEdit(a)}
                    title="Edit"
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    title="Delete"
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    {deletingId === a.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
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
