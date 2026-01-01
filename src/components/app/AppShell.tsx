import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { MobileSidebar } from './MobileSidebar'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { cn } from '@/lib/utils'

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // On mobile: toggle mobile sidebar
  // On desktop: toggle sidebar collapse
  const handleMenuClick = useCallback(() => {
    // Check if we're on mobile (< 1024px / lg breakpoint)
    if (window.innerWidth < 1024) {
      setMobileMenuOpen((prev) => !prev)
    } else {
      setSidebarCollapsed((prev) => !prev)
    }
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Top Bar - Always visible */}
        <TopBar onMenuClick={handleMenuClick} sidebarCollapsed={sidebarCollapsed} />

        {/* Desktop Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Mobile Sidebar */}
        <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        {/* Main Content */}
        <main
          className={cn(
            'min-h-[calc(100vh-3.5rem)] transition-all duration-200 ease-out',
            sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
          )}
        >
          <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto safe-area-bottom">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
