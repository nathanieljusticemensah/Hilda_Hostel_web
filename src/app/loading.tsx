import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/60">
      <div className="flex items-center gap-3 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    </div>
  )
}
