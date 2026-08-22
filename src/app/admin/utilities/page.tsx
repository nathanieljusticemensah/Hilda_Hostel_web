import LiveUtilities from '@/components/LiveUtilities'
import SignOutButton from '@/components/SignOutButton'
import { 
  LayoutDashboard, 
  Settings, 
  Home,
  Zap,
  Shield,
  Activity,
  User
} from 'lucide-react'
import Link from 'next/link'

export default function UtilitiesAdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md">
                  S
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Staff Dashboard
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Admin
                  </span>
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Utilities Control Panel
                </p>
              </div>
            </div>

            {/* Right Section */}
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                Utilities Control
              </h2>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Toggle utility states below. Changes broadcast to all connected clients.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">Live</span>
              <span className="text-[10px] text-emerald-600 font-mono">● Active</span>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {/* NOTE: these three numbers and the "Recent Activity" feed below are
            hardcoded placeholders, not wired to real data yet. Left as-is
            since that's new scope (would need an activity log table +
            queries), not a bug fix — flagging so it doesn't ship by accident. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Utilities</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">6</p>
              </div>
              <div className="p-2.5 bg-indigo-50 rounded-lg">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Currently On</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">3</p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Users</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">12</p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <Zap className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Utility Controls</h3>
              </div>
              <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
          </div>
          <div className="p-6">
            <LiveUtilities canToggle={true} />
          </div>
        </div>

        {/* Activity Log (Optional Enhancement) */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Recent Activity</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-slate-600">Lights turned ON by John Doe</span>
                <span className="text-xs text-slate-400 ml-auto">2 min ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-slate-600">AC turned OFF by Jane Smith</span>
                <span className="text-xs text-slate-400 ml-auto">15 min ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="text-slate-600">System status check completed</span>
                <span className="text-xs text-slate-400 ml-auto">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}