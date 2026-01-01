import { Link, useLocation } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import {
  House,
  Calendar,
  Storefront,
  Handshake,
  ChartLine,
  Gear,
  Plus,
  ShieldCheck,
  X,
} from '@phosphor-icons/react'
import { OrganizationSwitcher } from './OrganizationSwitcher'

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

const navigationItems = [
  { label: 'Overview', icon: House, path: '/dashboard' },
  { label: 'Events', icon: Calendar, path: '/dashboard/events' },
  { label: 'Vendors', icon: Storefront, path: '/dashboard/vendors' },
  { label: 'Sponsors', icon: Handshake, path: '/dashboard/sponsors' },
  { label: 'Analytics', icon: ChartLine, path: '/dashboard/analytics' },
]

const bottomItems = [{ label: 'Settings', icon: Gear, path: '/dashboard/settings' }]

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation()
  const currentUser = useQuery(api.queries.auth.getCurrentUser)
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin'

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar - Optimized width for mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] sm:w-72 bg-sidebar border-r border-border lg:hidden',
          'transform transition-transform duration-300 ease-out',
          'safe-area-top safe-area-bottom',
          'translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 border-b border-border">
          <Link to="/" className="font-mono text-sm sm:text-base font-bold" onClick={onClose}>
            <span className="text-foreground">open</span>
            <span className="text-primary">-</span>
            <span className="text-foreground">event</span>
          </Link>
          <button
            onClick={onClose}
            className="p-2.5 -mr-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Organization Switcher */}
        <div className="p-2.5 sm:p-3 border-b border-border">
          <OrganizationSwitcher />
        </div>

        {/* Create Event Button */}
        <div className="p-2.5 sm:p-3">
          <Link
            to="/dashboard/events/new"
            onClick={onClose}
            className={cn(
              'flex items-center justify-center gap-2 w-full px-4 py-3 sm:py-2.5 rounded-lg',
              'bg-primary text-primary-foreground font-medium text-sm',
              'hover:bg-primary/90 transition-all cursor-pointer touch-manipulation active:scale-[0.98]'
            )}
          >
            <Plus size={18} weight="bold" />
            Create Event
          </Link>
        </div>

        {/* Navigation - Larger touch targets */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 sm:space-y-1 overflow-y-auto mobile-scroll">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted'
                )}
              >
                <Icon size={20} weight={active ? 'duotone' : 'regular'} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-2 py-3 border-t border-border space-y-0.5 sm:space-y-1">
          {isAdmin && (
            <Link
              to="/admin"
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 active:bg-amber-500/25'
              )}
            >
              <ShieldCheck size={20} weight="duotone" />
              Admin Panel
            </Link>
          )}
          {bottomItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted'
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
