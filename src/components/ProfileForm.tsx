'use client'

import { useState } from 'react'
import supabase from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle, Save, User, Phone } from 'lucide-react'

interface ProfileFormProps {
  userId: string
  initialFullName: string
  initialPhoneNumber: string
}

export default function ProfileForm({
  userId,
  initialFullName,
  initialPhoneNumber,
}: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName)
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const hasChanges =
    fullName.trim() !== initialFullName || phoneNumber.trim() !== initialPhoneNumber

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    // Deliberately omit `role` from this payload -- the RLS policy
    // "Users update own non-role fields" only allows a self-update when
    // role is left unchanged, so we never send it from this form at all.
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
      })
      .eq('id', userId)
      .select('full_name, phone_number')

    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    if (!data || data.length === 0) {
      setMessage({ type: 'error', text: 'Update was blocked. Please try signing in again.' })
      return
    }

    setMessage({ type: 'success', text: 'Profile updated.' })
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="full-name" className="block text-sm font-medium text-slate-700 mb-1.5">
          Full Name
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
            placeholder="Your full name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone-number" className="block text-sm font-medium text-slate-700 mb-1.5">
          Phone Number
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="phone-number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
            placeholder="e.g. 024 123 4567"
          />
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-3 flex items-start gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="pt-2 flex items-center justify-end gap-3">
        {hasChanges && !saving && <span className="text-xs text-slate-500">Unsaved changes</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white py-2.5 px-5 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 disabled:shadow-sm"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  )
}