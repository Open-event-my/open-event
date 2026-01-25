import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { NotificationBell } from '@/components/notifications'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganizationRole } from '@/hooks/useOrganizationRole'
import { Badge } from '@/components/ui/badge'
import { useAuthActions } from '@convex-dev/auth/react'
import { SidebarSimple, SignOut, User, CaretDown, ShieldCheck } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

interface TopBarProps {
  onMenuClick?: () => void
  sidebarCollapsed?: boolean
}

const mainNavItems = [
  // Playground DISABLED - tldraw has React 18 compatibility issues
  // { label: 'Playground', path: '/dashboard/playground', badge: 'Beta' },
  { label: 'Integration', path: '/dashboard/integration', badge: 'Soon', muted: true },
]

export function TopBar({ onMenuClick, sidebarCollapsed }: TopBarProps) {
  const { user, signOut: customSignOut } = useAuth()
  const { signOut: convexSignOut } = useAuthActions()
  const { role } = useOrganizationRole()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      // Sign out from both auth systems
      await Promise.all([
        customSignOut().catch(() => {}), // Ignore errors, continue with sign out
        convexSignOut().catch(() => {}), // Ignore errors, continue with sign out
      ])
    } catch {
      // Ignore errors, still navigate to sign-in
    } finally {
      navigate('/sign-in')
    }
  }

  return (
    <header className="sticky top-0 z-40 h-14 bg-white dark:bg-card safe-area-top">
      <div className="flex items-center h-full px-2 sm:px-4">
        {/* Left: Menu toggle + Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-150 cursor-pointer touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            <SidebarSimple size={18} weight="regular" />
          </button>

          {/* Logo - always visible on mobile, visible when collapsed on desktop */}
          <Link
            to="/dashboard"
            className={cn(
              'transition-opacity',
              'lg:transition-all lg:duration-200',
              sidebarCollapsed ? 'lg:opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden'
            )}
          >
            <Logo size="sm" showDomain={false} />
          </Link>
        </div>

        {/* Center: Main Navigation - Desktop only (Typeform tab style) */}
        <nav className="hidden lg:flex items-center gap-1 ml-6">
          {mainNavItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-3 py-1.5 text-[14px] font-medium transition-all duration-150 relative flex items-center gap-2',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
                {item.badge && (
                  <span
                    className={cn(
                      'rounded-full font-medium',
                      item.muted
                        ? 'px-1 py-0.5 text-[9px] bg-muted text-muted-foreground'
                        : 'px-1.5 py-0.5 text-[10px] bg-purple/10 text-purple'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Notifications */}
          <NotificationBell />

          <ThemeToggle />

          {/* User menu dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-1 rounded-lg transition-all duration-150 touch-manipulation',
                'hover:bg-muted cursor-pointer',
                menuOpen && 'bg-muted'
              )}
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'User'}
                  className="w-7 h-7 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="w-7 h-7 sm:w-7 sm:h-7 rounded-full bg-accent flex items-center justify-center ring-2 ring-border">
                  <span className="text-xs font-medium text-accent-foreground">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <CaretDown
                size={12}
                weight="bold"
                className={cn(
                  'text-muted-foreground transition-transform hidden sm:block',
                  menuOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-xl shadow-lg py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                {/* User info */}
                <div className="px-3 py-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm text-foreground truncate max-w-[120px]">
                      {user?.name || 'User'}
                    </p>
                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal">
                      {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Viewer'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>

                {/* Menu items */}
                <Link
                  to="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-[14px] text-foreground hover:bg-muted transition-all duration-150"
                >
                  <User size={16} weight="duotone" />
                  Profile Settings
                </Link>

                {/* Admin Panel Link */}
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-[14px] hover:bg-amber-500/10 transition-all duration-150 text-amber-500 dark:text-amber-400"
                  >
                    <ShieldCheck size={16} weight="duotone" />
                    Admin Panel
                  </Link>
                )}

                <div className="h-px bg-border my-1" />

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[14px] text-red-500 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
                >
                  <SignOut size={16} weight="duotone" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
