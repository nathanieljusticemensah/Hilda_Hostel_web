import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// This layout is the actual authorization boundary for everything under /admin.
// Middleware only confirms the visitor is *logged in* (cheap, Edge-safe check).
// Role lookup requires a DB query, so it belongs here in a Server Component
// running on the Node.js runtime, not in Edge middleware.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Belt-and-suspenders: middleware should already have redirected, but
  // don't assume — this layout must be safe to render standalone too.
  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // TEMP DEBUG — remove once the redirect bug is confirmed fixed
  console.log('[admin/layout] user.id =', user.id, '| profile =', profile, '| error =', error)

  if (error || !profile || !['admin', 'staff'].includes(profile.role)) {
    redirect('/')
  }

  return <>{children}</>
}