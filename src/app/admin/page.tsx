import { redirect } from 'next/navigation'

// Bare /admin has no content of its own — send staff/admin to the
// utilities dashboard. Authorization is already handled by admin/layout.tsx.
export default function AdminIndexPage() {
  redirect('/admin/utilities')
}
