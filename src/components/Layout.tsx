import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, GitFork, ShieldCheck,
  Wrench, AlertTriangle, Upload, FileText, Activity,
  HardHat, Zap, ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const NAV = [
  { path: '/dashboard',   label: 'Command Centre',    icon: LayoutDashboard,  group: 'overview' },
  { path: '/query',       label: 'Expert Copilot',    icon: MessageSquare,    group: 'intelligence' },
  { path: '/graph',       label: 'Knowledge Graph',   icon: GitFork,          group: 'intelligence' },
  { path: '/compliance',  label: 'Compliance Intel',  icon: ShieldCheck,      group: 'intelligence' },
  { path: '/maintenance', label: 'Maintenance AI',    icon: Wrench,           group: 'intelligence' },
  { path: '/rca',         label: 'Root Cause Agent',  icon: AlertTriangle,    group: 'intelligence' },
  { path: '/health',      label: 'Knowledge Health',  icon: Activity,         group: 'intelligence' },
  { path: '/field',       label: 'Field Assist',      icon: HardHat,          group: 'field' },
  { path: '/documents',   label: 'Document Library',  icon: FileText,         group: 'data' },
  { path: '/ingest',      label: 'Ingest Documents',  icon: Upload,           group: 'data' },
]

const GROUPS: Record<string, string> = {
  overview:     '',
  intelligence: 'AI INTELLIGENCE',
  field:        'FIELD TOOLS',
  data:         'KNOWLEDGE BASE',
}

export default function Layout() {
  const location = useLocation()

  const grouped = NAV.reduce<Record<string, typeof NAV>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  return (
    <div className="flex h-screen overflow-hidden bg-carbon-950">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/5 bg-carbon-950">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/5">
          <div className="w-7 h-7 rounded bg-signal-green/10 border border-signal-green/30 flex items-center justify-center">
            <Zap size={14} className="text-signal-green" />
          </div>
          <div>
            <div className="text-xs font-semibold text-carbon-100 leading-tight">Industrial Brain</div>
            <div className="text-[10px] text-carbon-500 leading-tight font-mono">v1.0 · DEMO</div>
          </div>
        </div>

        {/* Plant indicator */}
        <div className="px-4 py-2.5 border-b border-white/5">
          <div className="text-[10px] text-carbon-500 uppercase tracking-widest mb-0.5">Active Plant</div>
          <div className="text-xs text-carbon-300 font-medium truncate">
            {import.meta.env.VITE_PLANT_NAME ?? 'Bharat Steel Works'}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="signal-dot bg-signal-green text-signal-green w-1.5 h-1.5" />
            <span className="text-[10px] text-signal-green font-mono">ONLINE</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-4">
              {GROUPS[group] && (
                <div className="px-2 py-1 text-[10px] text-carbon-600 tracking-widest font-medium">
                  {GROUPS[group]}
                </div>
              )}
              {items.map((item) => {
                const Icon = item.icon
                const active = location.pathname.startsWith(item.path)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs mb-0.5 transition-all duration-150 group
                      ${active
                        ? 'bg-signal-green/8 text-signal-green border border-signal-green/15'
                        : 'text-carbon-400 hover:text-carbon-200 hover:bg-white/4 border border-transparent'
                      }`}
                  >
                    <Icon size={13} className="flex-shrink-0" />
                    <span className="flex-1 font-medium">{item.label}</span>
                    {active && <ChevronRight size={10} className="text-signal-green/50" />}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="text-[10px] text-carbon-600 font-mono">
            ET AI Hackathon 2026
          </div>
          <div className="text-[10px] text-carbon-700 font-mono">
            Problem Statement #8
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
