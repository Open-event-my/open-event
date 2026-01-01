import { Link, useLocation } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { Logo, LogoIcon } from '@/components/ui/logo'
import {
  House,
  Calendar,
  Storefront,
  Handshake,
  ChartLine,
  Gear,
  Plus,
  ShieldCheck,
} from '@phosphor-icons/react'

interface SidebarProps {
  collapsed: boolean
}

const navigationItems = [
  { label: 'Overview', icon: House, path: '/dashboard', number: null },
  { label: 'Events', icon: Calendar, path: '/dashboard/events', number: 1 },
  { label: 'Vendors', icon: Storefront, path: '/dashboard/vendors', number: 2 },
  { label: 'Sponsors', icon: Handshake, path: '/dashboard/sponsors', number: 3 },
  { label: 'Analytics', icon: ChartLine, path: '/dashboard/analytics', number: 4 },
]

const bottomItems = [{ label: 'Settings', icon: Gear, path: '/dashboard/settings' }]

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation()
  const currentUser = useQuery(api.queries.auth.getCurrentUser)
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin'

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:top-14',
        'bg-white dark:bg-sidebar transition-all duration-200 ease-out z-30',
        collapsed ? 'lg:w-16' : 'lg:w-60'
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex items-center h-12 px-4 transition-all duration-200',
          collapsed ? 'justify-center' : 'justify-start'
        )}
      >
        <Link to="/dashboard" className="flex items-center">
          {collapsed ? <LogoIcon size="sm" /> : <Logo size="sm" showDomain={false} />}
        </Link>
      </div>

      {/* Create Event Button */}
      <div className="px-3 pb-3">
        <Link
          to="/dashboard/events/new"
          className={cn(
            'flex items-center gap-2 w-full py-2.5 rounded-lg',
            'bg-foreground text-background font-medium text-[14px]',
            'hover:opacity-90 transition-all duration-150',
            collapsed ? 'px-2 justify-center' : 'px-3'
          )}
          title={collapsed ? 'Create Event' : undefined}
        >
          <Plus size={16} weight="bold" />
          {!collapsed && <span>Add content</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150',
                collapsed ? 'px-2 justify-center' : 'px-3',
                active
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {/* Numbered badge like Typeform */}
              {item.number && !collapsed ? (
                <span
                  className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold',
                    active
                      ? 'bg-yellow text-foreground dark:text-background'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {item.number}
                </span>
              ) : (
                <Icon size={18} weight={active ? 'fill' : 'regular'} />
              )}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-2 py-3 space-y-0.5">
        {/* Section divider */}
        <div className="mx-1 mb-3 border-t border-border" />

        {/* Admin Panel Link */}
        {isAdmin && (
          <Link
            to="/admin"
            title={collapsed ? 'Admin Panel' : undefined}
            className={cn(
              'flex items-center gap-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150',
              collapsed ? 'px-2 justify-center' : 'px-3',
              'text-amber-500 dark:text-amber-400 hover:bg-amber-500/10'
            )}
          >
            <ShieldCheck size={18} weight="duotone" />
            {!collapsed && <span>Admin Panel</span>}
          </Link>
        )}
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150',
                collapsed ? 'px-2 justify-center' : 'px-3',
                active
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon size={18} weight={active ? 'fill' : 'regular'} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
