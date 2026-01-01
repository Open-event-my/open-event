import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  House,
  Users,
  Storefront,
  Handshake,
  ShieldCheck,
  Gear,
  X,
  ArrowLeft,
  ClipboardText,
  Sparkle,
} from '@phosphor-icons/react'

const navigationItems = [
  { label: 'Overview', icon: House, path: '/admin' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Vendors', icon: Storefront, path: '/admin/vendors' },
  { label: 'Sponsors', icon: Handshake, path: '/admin/sponsors' },
  { label: 'Applications', icon: ClipboardText, path: '/admin/applications' },
  { label: 'Moderation', icon: ShieldCheck, path: '/admin/moderation' },
  { label: 'AI Usage', icon: Sparkle, path: '/admin/ai-usage' },
]

const bottomItems = [{ label: 'Settings', icon: Gear, path: '/admin/settings' }]

interface AdminMobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function AdminMobileSidebar({ open, onClose }: AdminMobileSidebarProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={onClose} />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Link to="/admin" className="font-mono text-lg font-bold" onClick={onClose}>
              <span className="text-foreground">open</span>
              <span className="text-primary">-</span>
              <span className="text-foreground">event</span>
            </Link>
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
              Admin
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Back to Dashboard Link */}
        <div className="p-4">
          <Link
            to="/dashboard"
            onClick={onClose}
            className={cn(
              'flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg',
              'bg-muted text-muted-foreground font-medium text-sm',
              'hover:bg-muted/80 transition-colors cursor-pointer'
            )}
          >
            <ArrowLeft size={18} weight="bold" />
            Back to Dashboard
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon size={20} weight={active ? 'duotone' : 'regular'} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-4 border-t border-border bg-background">
          {bottomItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon size={20} weight={active ? 'duotone' : 'regular'} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </aside>
    </>
  )
}
