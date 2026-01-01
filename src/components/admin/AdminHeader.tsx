import { Link, useNavigate } from 'react-router-dom'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { SidebarSimple, SignOut, User, CaretDown, ShieldCheck } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import { AdminNotifications } from './AdminNotifications'

interface AdminHeaderProps {
  onMenuClick?: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  const user = useQuery(api.queries.auth.getCurrentUser)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
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
    await signOut()
    navigate('/sign-in')
  }

  const roleLabel = user?.role === 'superadmin' ? 'Superadmin' : 'Admin'

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Mobile menu button + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <SidebarSimple size={22} weight="duotone" />
          </button>
          <Link
            to="/admin"
            className="lg:hidden font-mono text-lg font-bold flex items-center gap-2"
          >
            <span className="text-foreground">open</span>
            <span className="text-primary">-</span>
            <span className="text-foreground">event</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
              Admin
            </span>
          </Link>
        </div>

        {/* Admin Panel Title - desktop only */}
        <div className="hidden lg:flex items-center gap-3">
          <ShieldCheck size={24} weight="duotone" className="text-amber-600 dark:text-amber-400" />
          <div>
            <h1 className="text-lg font-semibold">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">{roleLabel} - Platform Management</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Admin Notifications */}
          <AdminNotifications />

          <ThemeToggle />

          {/* User menu dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                'flex items-center gap-2 p-1.5 rounded-lg transition-colors',
                'hover:bg-muted cursor-pointer',
                menuOpen && 'bg-muted'
              )}
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-500/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center ring-2 ring-amber-500/30">
                  <ShieldCheck
                    size={16}
                    weight="duotone"
                    className="text-amber-600 dark:text-amber-400"
                  />
                </div>
              )}
              <CaretDown
                size={14}
                weight="bold"
                className={cn(
                  'text-muted-foreground transition-transform hidden sm:block',
                  menuOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
                {/* User info */}
                <div className="px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{user?.name || 'User'}</p>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>

                {/* Menu items */}
                <Link
                  to="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <User size={16} weight="duotone" />
                  Admin Settings
                </Link>

                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <User size={16} weight="duotone" />
                  Back to Dashboard
                </Link>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
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
