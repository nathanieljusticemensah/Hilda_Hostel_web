import Link from 'next/link'
import NextImage from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Megaphone, Pin, Home, Settings, ArrowLeft } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  category: string | null
  priority: string | null
  image_url: string | null
  is_pinned: boolean
  created_at: string
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  important: 'bg-amber-50 text-amber-700 border-amber-200',
  general: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default async function AnnouncementsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let canManage = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    canManage = profile?.role === 'admin' || profile?.role === 'staff'
  }

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, category, priority, image_url, is_pinned, created_at')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  const announcements = (data ?? []) as Announcement[]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Megaphone className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Announcements</h1>
                <p className="text-xs text-slate-500">Notices and emergency contacts from hostel staff</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && (
                <Link
                  href="/admin/announcements"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                >
                  <Settings className="w-4 h-4" />
                  Manage
                </Link>
              )}
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 text-sm text-red-700">
            Couldn&apos;t load announcements: {error.message}
          </div>
        ) : announcements.length === 0 ? (
          <div className="surface-card border-dashed p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-slate-100 rounded-full">
                <Megaphone className="w-8 h-8 text-slate-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No announcements yet</h3>
            <p className="text-sm text-slate-500">Check back here for hostel notices and updates.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => {
              const priorityClass = PRIORITY_STYLES[a.priority ?? 'general'] ?? PRIORITY_STYLES.general
              return (
                <article key={a.id} className="surface-card overflow-hidden">
                  {a.image_url && (
                    <div className="relative w-full h-48 bg-slate-100">
                      <NextImage
                        src={`${a.image_url}?tr=w-800,f-auto`}
                        alt={a.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h2 className="text-lg font-semibold text-slate-900">{a.title}</h2>
                      {a.is_pinned && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Pin className="w-3 h-3" />
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.content}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {a.category && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md capitalize">
                          {a.category.replace('_', ' ')}
                        </span>
                      )}
                      {a.priority && a.priority !== 'general' && (
                        <span className={`px-2.5 py-1 rounded-md border capitalize font-medium ${priorityClass}`}>
                          {a.priority}
                        </span>
                      )}
                      <span className="text-slate-400 ml-auto">
                        {new Date(a.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 mt-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </main>
    </div>
  )
}
