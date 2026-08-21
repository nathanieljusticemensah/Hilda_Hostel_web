import LiveUtilities from '@/components/LiveUtilities'

export default function UtilitiesAdminPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-semibold">S</div>
            <div>
              <div className="text-sm font-semibold">Staff Dashboard</div>
              <div className="text-xs text-slate-500">Utilities Control</div>
            </div>
          </div>
          <nav>
            <a href="/" className="text-xs text-slate-600 hover:text-slate-900">Home</a>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <section>
          <h2 className="text-lg font-semibold mb-2">Toggle Utilities</h2>
          <p className="text-sm text-slate-600 mb-4">Staff may toggle utility states below. Actions broadcast to all connected clients.</p>
          <LiveUtilities canToggle={true} />
        </section>
      </main>
    </div>
  )
}
