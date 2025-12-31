import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  UserGear,
  UserPlus,
  ShieldCheck,
  MagnifyingGlass,
  Trash,
  Warning,
  CheckCircle,
  XCircle,
  Clock,
} from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AdminStatus = 'active' | 'suspended' | 'pending'

interface AdminUser {
  _id: Id<'users'>
  name?: string
  email?: string
  status: AdminStatus
  createdAt?: number
  updatedAt?: number
}

const statusConfig: Record<AdminStatus, { bg: string; text: string; label: string }> = {
  active: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    label: 'Active',
  },
  suspended: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    label: 'Suspended',
  },
  pending: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-600',
    label: 'Pending',
  },
}

// Fallback config for unknown statuses
const defaultStatusConfig = {
  bg: 'bg-gray-500/10',
  text: 'text-gray-600',
  label: 'Unknown',
}

export function AdminManagement() {
  const currentUser = useQuery(api.queries.auth.getCurrentUser)
  const isSuperadmin = currentUser?.role === 'superadmin'

  // Only superadmins can access this page - skip query for regular admins
  const admins = useQuery(api.admin.listAdmins, isSuperadmin ? {} : 'skip')
  const createAdmin = useMutation(api.admin.createAdmin)
  const removeAdmin = useMutation(api.admin.removeAdmin)

  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Filter admins by search query
  const filteredAdmins = admins?.filter((admin) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      admin.name?.toLowerCase().includes(query) || admin.email?.toLowerCase().includes(query)
    )
  })

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminName) {
      toast.error('Please fill in all fields')
      return
    }

    // Basic email validation
    if (!newAdminEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    try {
      await createAdmin({ email: newAdminEmail.trim(), name: newAdminName.trim() })
      toast.success('Admin created successfully')
      setShowCreateModal(false)
      setNewAdminEmail('')
      setNewAdminName('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create admin')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAdmin = async () => {
    if (!selectedAdmin) return

    setIsLoading(true)
    try {
      await removeAdmin({ adminId: selectedAdmin._id })
      toast.success('Admin role removed successfully')
      setShowRemoveModal(false)
      setSelectedAdmin(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove admin')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Only superadmins can access this page
  if (!isSuperadmin) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <ShieldCheck size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Superadmin Access Required</h2>
          <p className="text-muted-foreground mt-2">
            This page is only accessible to superadmin users.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserGear size={28} weight="duotone" className="text-purple-500" />
            Admin Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage admin accounts and permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg',
            'bg-purple-600 text-white font-medium text-sm',
            'hover:bg-purple-700 transition-colors cursor-pointer'
          )}
        >
          <UserPlus size={18} weight="bold" />
          Add Admin
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Search admins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            'w-full pl-10 pr-4 py-2.5 rounded-lg text-sm',
            'border border-border bg-background',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500'
          )}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <ShieldCheck size={20} className="text-purple-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{admins?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Admins</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {admins?.filter((a) => a.status === 'active').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle size={20} className="text-red-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {admins?.filter((a) => a.status === 'suspended').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Admin
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admins === undefined ? (
                // Loading state
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="h-3 w-48 bg-muted rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-6 w-16 bg-muted rounded-full" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-24 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-8 w-8 bg-muted rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredAdmins && filteredAdmins.length > 0 ? (
                filteredAdmins.map((admin) => {
                  const status = (admin.status || 'active') as AdminStatus
                  const config = statusConfig[status] || defaultStatusConfig

                  return (
                    <tr key={admin._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <ShieldCheck size={20} className="text-purple-600" weight="duotone" />
                          </div>
                          <div>
                            <p className="font-medium">{admin.name || 'Unnamed Admin'}</p>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                            config.bg,
                            config.text
                          )}
                        >
                          {status === 'active' ? (
                            <CheckCircle size={12} weight="fill" />
                          ) : status === 'pending' ? (
                            <Clock size={12} weight="fill" />
                          ) : (
                            <XCircle size={12} weight="fill" />
                          )}
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(admin.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin as AdminUser)
                              setShowRemoveModal(true)
                            }}
                            className={cn(
                              'p-2 rounded-lg text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer'
                            )}
                            title="Remove admin role"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck size={48} className="text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No admins match your search' : 'No admins found'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Admin Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={20} className="text-purple-600" />
              Add New Admin
            </DialogTitle>
            <DialogDescription>
              Create a new admin account or upgrade an existing user to admin role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name</Label>
              <Input
                id="admin-name"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Enter admin name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="Enter admin email"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAdmin}
              disabled={isLoading || !newAdminEmail || !newAdminName}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-purple-600 text-white',
                'hover:bg-purple-700 transition-colors cursor-pointer',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Creating...' : 'Create Admin'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Confirmation Modal */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Warning size={20} weight="fill" />
              Remove Admin Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove admin privileges from{' '}
              <strong>{selectedAdmin?.name || selectedAdmin?.email}</strong>? They will be
              demoted to organizer role.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              onClick={() => {
                setShowRemoveModal(false)
                setSelectedAdmin(null)
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRemoveAdmin}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-red-600 text-white',
                'hover:bg-red-700 transition-colors cursor-pointer',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Removing...' : 'Remove Admin'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
