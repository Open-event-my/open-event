import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'
import { AdminMobileSidebar } from './AdminMobileSidebar'
import { AdminProtectedRoute } from './AdminProtectedRoute'

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <AdminSidebar />

        {/* Mobile Sidebar */}
        <AdminMobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        {/* Main Content */}
        <div className="lg:pl-64">
          <AdminHeader onMenuClick={() => setMobileMenuOpen(true)} />

          <main className="p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminProtectedRoute>
  )
}
