import { Link, useLocation } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'
import {
  House,
  Users,
  Storefront,
  Handshake,
  ShieldCheck,
  Gear,
  ArrowLeft,
  ClipboardText,
  Sparkle,
  ClockCounterClockwise,
  Gauge,
  UserGear,
  Flag,
  Buildings,
  PaperPlaneTilt,
} from '@phosphor-icons/react'

const navigationItems = [
  { label: 'Overview', icon: House, path: '/admin' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Organizations', icon: Buildings, path: '/admin/organizations' },
  { label: 'Vendors', icon: Storefront, path: '/admin/vendors' },
  { label: 'Sponsors', icon: Handshake, path: '/admin/sponsors' },
  { label: 'Inquiries', icon: PaperPlaneTilt, path: '/admin#inquiries' },
  { label: 'Applications', icon: ClipboardText, path: '/admin/applications' },
  { label: 'Moderation', icon: ShieldCheck, path: '/admin/moderation' },
  { label: 'Event Moderation', icon: Flag, path: '/admin/event-moderation' },
  { label: 'AI Usage', icon: Sparkle, path: '/admin/ai-usage' },
  { label: 'Audit Logs', icon: ClockCounterClockwise, path: '/admin/audit-logs' },
  { label: 'Rate Limits', icon: Gauge, path: '/admin/rate-limits' },
]

// Superadmin-only navigation items
const superadminItems = [{ label: 'Admin Management', icon: UserGear, path: '/admin/admins' }]

const bottomItems = [{ label: 'Settings', icon: Gear, path: '/admin/settings' }]

export function AdminSidebar() {
  const location = useLocation()
  const currentUser = useQuery(api.queries.auth.getCurrentUser)

  // Only show "Back to Dashboard" for admins who also act as organizers
  // Superadmins are pure platform managers, they don't need organizer dashboard
  const showBackToDashboard = currentUser?.role === 'admin'
  const isSuperadmin = currentUser?.role === 'superadmin'

  const isActive = (path: string) => {
    const [pathname, hash] = path.split('#')

    if (hash) {
      return location.pathname === pathname && location.hash === `#${hash}`
    }

    if (pathname === '/admin') {
      return location.pathname === '/admin' && !location.hash
    }

    return location.pathname.startsWith(pathname)
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-background">
      {/* Logo with Admin Badge */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-border">
        <Link to="/admin">
          <Logo size="sm" showDomain={false} />
        </Link>
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
          Admin
        </span>
      </div>

      {/* Back to Dashboard Link - Only show for admins (not superadmins) */}
      {showBackToDashboard && (
        <div className="p-4">
          <Link
            to="/dashboard"
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
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
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

        {/* Superadmin-only section */}
        {isSuperadmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Superadmin
              </p>
            </div>
            {superadminItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon size={20} weight={active ? 'duotone' : 'regular'} />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-border">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
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
  )
}
