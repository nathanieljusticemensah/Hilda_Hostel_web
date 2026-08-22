"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import supabase from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  Upload, 
  AlertCircle, 
  CheckCircle,
  Home,
  FileText,
  Loader2
} from 'lucide-react'

const categories = [
  { label: 'Plumbing', value: 'plumbing', icon: '🔧' },
  { label: 'Electrical', value: 'electrical', icon: '⚡' },
  { label: 'Carpentry', value: 'carpentry', icon: '🪚' },
  { label: 'Masonry', value: 'masonry', icon: '🧱' },
  { label: 'Noise Complaint', value: 'noise_complaint', icon: '🔊' },
  { label: 'Other', value: 'other', icon: '📌' },
]
const categoryValues = categories.map((c) => c.value) as [string, ...string[]]

// Mirrors the ticket_category enum and column constraints in hostel_schema.sql.
// Runs client-side before we ever touch ImageKit or Supabase.
const ticketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters.')
    .max(120, 'Title must be under 120 characters.'),
  category: z.enum(categoryValues, { message: 'Please choose a valid category.' }),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be under 2000 characters.')
    .optional()
    .or(z.literal('')),
})

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB, matches the UI copy
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function validateImageFile(f: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) {
    return 'Please upload a JPG, PNG, GIF, or WEBP image.'
  }
  if (f.size > MAX_FILE_SIZE_BYTES) {
    return 'Image must be smaller than 10MB.'
  }
  return null
}

export default function NewTicketPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(categories[0].value)
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [user, setUser] = useState<any | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  async function uploadToImageKit(file: File) {
    const authRes = await fetch('/api/imagekit/auth')
    if (!authRes.ok) throw new Error('ImageKit auth failed')
    const auth = await authRes.json()

    const form = new FormData()
    form.append('file', file)
    form.append('fileName', file.name)
    form.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '')
    form.append('signature', auth.signature)
    form.append('token', auth.token)
    form.append('expire', String(auth.expire))
    form.append('folder', '/Hilda_Hostel/maintenance_tickets')

    const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: form,
    })

    const data = await uploadRes.json()
    if (!uploadRes.ok) throw new Error(data.message || 'Upload failed')
    return { url: data.url, fileId: data.fileId }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = ticketSchema.safeParse({ title, category, description })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check the form and try again.')
      return
    }
    if (file) {
      const fileError = validateImageFile(file)
      if (fileError) {
        setError(fileError)
        return
      }
    }

    setLoading(true)

    try {
      let image_url: string | null = null
      let image_file_id: string | null = null
      
      if (file) {
        const result = await uploadToImageKit(file)
        image_url = result.url
        image_file_id = result.fileId
      }

      const currentUser = user ?? (await supabase.auth.getUser()).data?.user
      if (!currentUser) {
        setError('You must be signed in to submit a ticket.')
        setLoading(false)
        return
      }

      if (!roomId) {
        setError('You cannot submit a ticket until a room is assigned. Please contact administration.')
        setLoading(false)
        return
      }

      const payload = {
        student_id: currentUser.id,
        room_id: roomId,
        title: title || `${category} issue`,
        description: description || '',
        category,
        image_url,
        image_file_id,
      }

      const { error: insertError } = await supabase.from('maintenance_tickets').insert(payload)
      if (insertError) {
        throw new Error(insertError.message)
      }

      router.push('/tickets')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function checkAuthAndProfile() {
      try {
        const { data } = await supabase.auth.getUser()
        const currentUser = (data as any)?.user
        if (!currentUser) {
          router.replace('/login')
          return
        }
        if (!mounted) return
        setUser(currentUser)

        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('room_id, role')
          .eq('id', currentUser.id)
          .single()

        if (!profileErr && profileData) {
          setRoomId(profileData.room_id ?? null)
          setRole(profileData.role ?? null)
          if (profileData.role !== 'resident') {
            router.replace('/')
            return
          }
        } else {
          setRoomId(null)
          setRole(null)
        }
      } catch (err) {
        console.error('Auth check failed', err)
        router.replace('/login')
      } finally {
        if (mounted) setCheckingAuth(false)
      }
    }

    checkAuthAndProfile()
    return () => {
      mounted = false
    }
  }, [router])

  // Handle file selection with preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    if (selectedFile) {
      const fileError = validateImageFile(selectedFile)
      if (fileError) {
        setError(fileError)
        e.target.value = '' // reset the input so the same bad file can be re-selected after fixing
        return
      }
    }
    setError(null)
    setFile(selectedFile)
    if (selectedFile) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setFilePreview(null)
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files?.[0]
    if (!droppedFile) return

    const fileError = validateImageFile(droppedFile)
    if (fileError) {
      setError(fileError)
      return
    }

    setError(null)
    setFile(droppedFile)
    const reader = new FileReader()
    reader.onloadend = () => {
      setFilePreview(reader.result as string)
    }
    reader.readAsDataURL(droppedFile)
  }

  const removeFile = () => {
    setFile(null)
    setFilePreview(null)
  }

  if (checkingAuth) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="ml-3 text-slate-600">Checking authentication...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors duration-200 mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Back to Tickets
        </button>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Report Maintenance Issue</h1>
            <p className="text-slate-500 text-sm">Submit a new maintenance request for your room</p>
          </div>
        </div>
      </div>

      {/* Room Alert */}
      {!roomId && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">No Room Assigned</p>
            <p className="mt-1">You don't have a room assigned yet. Please contact administration before submitting a maintenance ticket.</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Leaky faucet in bathroom"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1.5">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200 appearance-none bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
            Description <span className="text-slate-400 text-xs font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200 min-h-[140px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail. Include location, severity, and any other relevant information."
          />
          <p className="mt-1.5 text-xs text-slate-400">
            {description.length} characters
          </p>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Photo <span className="text-slate-400 text-xs font-normal">(optional)</span>
          </label>
          
          {!filePreview ? (
            <div
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-200 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <Upload className="w-6 h-6 text-slate-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Click to upload or drag & drop</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
              <img
                src={filePreview}
                alt="Preview"
                className="w-full max-h-64 object-contain"
              />
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {file?.name}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Submission Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !roomId}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : roomId ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Submit Ticket
            </>
          ) : (
            <>
              <Home className="w-5 h-5" />
              Room Required
            </>
          )}
        </button>
      </form>
    </div>
  )
}