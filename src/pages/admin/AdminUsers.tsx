import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  ShieldCheck,
  MagnifyingGlass,
  DotsThree,
  CheckCircle,
  XCircle,
  Warning,
  EnvelopeSimple,
  UserCircle,
  Crown,
  Trash,
  CaretDown,
  CheckSquare,
  Square,
  MinusSquare,
} from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type UserStatus = 'active' | 'suspended' | 'pending'
type UserRole = 'admin' | 'organizer' | 'superadmin'

const statusConfig: Record<
  UserStatus,
  { bg: string; text: string; label: string; description: string }
> = {
  active: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    label: 'Active',
    description: 'User has full access',
  },
  suspended: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    label: 'Suspended',
    description: 'Access restricted',
  },
  pending: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    label: 'Pending',
    description: 'Awaiting verification',
  },
}

const roleConfig: Record<
  UserRole,
  { bg: string; text: string; icon: typeof ShieldCheck; description: string }
> = {
  superadmin: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    icon: Crown,
    description: 'Full platform access',
  },
  admin: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    icon: ShieldCheck,
    description: 'Manage users & content',
  },
  organizer: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    icon: UserCircle,
    description: 'Create & manage events',
  },
}

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
] as const

const roleFilters = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admins' },
  { value: 'organizer', label: 'Organizers' },
] as const

export function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'organizer'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Id<'users'> | null>(null)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [actionReason, setActionReason] = useState('')

  const currentUser = useQuery(api.queries.auth.getCurrentUser)
  const isSuperadmin = currentUser?.role === 'superadmin'

  // Pagination state
  const [offset, setOffset] = useState(0)
  const PAGE_SIZE = 20

  // Get counts for stats (lightweight query)
  const userCounts = useQuery(api.admin.getUserCounts)

  // Get paginated users with filters
  const usersResult = useQuery(
    api.admin.listAllUsersPaginated,
    roleFilter === 'all'
      ? { status: statusFilter === 'all' ? undefined : statusFilter, limit: PAGE_SIZE, offset }
      : {
          role: roleFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: PAGE_SIZE,
          offset,
        }
  )

  // Only superadmins can list admins - skip query for regular admins
  const admins = useQuery(api.admin.listAdmins, isSuperadmin ? {} : 'skip')

  const createAdmin = useMutation(api.admin.createAdmin)
  const removeAdmin = useMutation(api.admin.removeAdmin)
  const suspendUser = useMutation(api.moderation.suspendUser)
  const unsuspendUser = useMutation(api.moderation.unsuspendUser)
  const bulkSuspendUsers = useMutation(api.admin.bulkSuspendUsers)
  const bulkUnsuspendUsers = useMutation(api.admin.bulkUnsuspendUsers)
  const bulkChangeRole = useMutation(api.admin.bulkChangeRole)

  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<Id<'users'>>>(new Set())
  const [showBulkSuspendModal, setShowBulkSuspendModal] = useState(false)
  const [showBulkUnsuspendModal, setShowBulkUnsuspendModal] = useState(false)
  const [showBulkRoleModal, setShowBulkRoleModal] = useState(false)
  const [bulkRoleTarget, setBulkRoleTarget] = useState<'admin' | 'organizer'>('organizer')
  const [isBulkLoading, setIsBulkLoading] = useState(false)

  // Reset pagination when filters change
  const handleFilterChange = useCallback((type: 'role' | 'status', value: string) => {
    setOffset(0)
    if (type === 'role') {
      setRoleFilter(value as 'all' | 'admin' | 'organizer')
    } else {
      setStatusFilter(value as 'all' | 'active' | 'suspended' | 'pending')
    }
  }, [])

  // Status counts from lightweight query
  const statusCounts = useMemo(() => {
    if (!userCounts) return {}
    return {
      active: userCounts.active,
      suspended: userCounts.suspended,
      pending: userCounts.pending,
    }
  }, [userCounts])

  // Filter users by search query with useMemo
  const filteredUsers = useMemo(() => {
    if (!usersResult?.items) return []
    if (!searchQuery.trim()) return usersResult.items
    const search = searchQuery.toLowerCase()
    return usersResult.items.filter(
      (u) => u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search)
    )
  }, [usersResult, searchQuery])

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (usersResult?.hasMore) {
      setOffset((prev) => prev + PAGE_SIZE)
    }
  }, [usersResult?.hasMore])

  const handleCreateAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminName.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      await createAdmin({ email: newAdminEmail.trim(), name: newAdminName.trim() })
      toast.success('Admin created successfully')
      setShowCreateModal(false)
      setNewAdminName('')
      setNewAdminEmail('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create admin')
    }
  }

  const handleRemoveAdmin = async () => {
    if (!selectedUser) return

    try {
      await removeAdmin({ adminId: selectedUser, reason: actionReason || undefined })
      toast.success('Admin role removed')
      setShowRemoveModal(false)
      setSelectedUser(null)
      setActionReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove admin')
    }
  }

  const handleSuspendUser = async () => {
    if (!selectedUser || !actionReason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    try {
      await suspendUser({ userId: selectedUser, reason: actionReason })
      toast.success('User suspended')
      setShowSuspendModal(false)
      setSelectedUser(null)
      setActionReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to suspend user')
    }
  }

  const handleUnsuspendUser = async () => {
    if (!selectedUser) return

    try {
      await unsuspendUser({ userId: selectedUser, reason: actionReason || undefined })
      toast.success('User unsuspended')
      setShowUnsuspendModal(false)
      setSelectedUser(null)
      setActionReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unsuspend user')
    }
  }

  const openSuspendModal = (userId: Id<'users'>, userName: string) => {
    setSelectedUser(userId)
    setSelectedUserName(userName)
    setActionReason('')
    setShowSuspendModal(true)
  }

  const openUnsuspendModal = (userId: Id<'users'>, userName: string) => {
    setSelectedUser(userId)
    setSelectedUserName(userName)
    setActionReason('')
    setShowUnsuspendModal(true)
  }

  const openRemoveAdminModal = (userId: Id<'users'>, userName: string) => {
    setSelectedUser(userId)
    setSelectedUserName(userName)
    setActionReason('')
    setShowRemoveModal(true)
  }

  // Bulk selection handlers
  const toggleUserSelection = useCallback((userId: Id<'users'>) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (!filteredUsers) return
    const selectableUsers = filteredUsers.filter(
      (u) => u._id !== currentUser?._id && u.role !== 'superadmin'
    )
    if (selectedUsers.size === selectableUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(selectableUsers.map((u) => u._id)))
    }
  }, [filteredUsers, selectedUsers.size, currentUser?._id])

  const clearSelection = useCallback(() => {
    setSelectedUsers(new Set())
  }, [])

  // Bulk action handlers
  const handleBulkSuspend = async () => {
    if (selectedUsers.size === 0 || !actionReason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    setIsBulkLoading(true)
    try {
      const result = await bulkSuspendUsers({
        userIds: Array.from(selectedUsers),
        reason: actionReason,
      })
      if (result.success) {
        toast.success(`Successfully suspended ${result.summary.succeeded} users`)
      } else {
        toast.warning(
          `Suspended ${result.summary.succeeded} users, ${result.summary.failed} failed`
        )
      }
      setShowBulkSuspendModal(false)
      setSelectedUsers(new Set())
      setActionReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk suspend failed')
    } finally {
      setIsBulkLoading(false)
    }
  }

  const handleBulkUnsuspend = async () => {
    if (selectedUsers.size === 0) return

    setIsBulkLoading(true)
    try {
      const result = await bulkUnsuspendUsers({
        userIds: Array.from(selectedUsers),
      })
      if (result.success) {
        toast.success(`Successfully unsuspended ${result.summary.succeeded} users`)
      } else {
        toast.warning(
          `Unsuspended ${result.summary.succeeded} users, ${result.summary.failed} failed`
        )
      }
      setShowBulkUnsuspendModal(false)
      setSelectedUsers(new Set())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk unsuspend failed')
    } finally {
      setIsBulkLoading(false)
    }
  }

  const handleBulkRoleChange = async () => {
    if (selectedUsers.size === 0) return

    setIsBulkLoading(true)
    try {
      const result = await bulkChangeRole({
        userIds: Array.from(selectedUsers),
        newRole: bulkRoleTarget,
      })
      if (result.success) {
        toast.success(`Successfully changed role for ${result.summary.succeeded} users`)
      } else {
        toast.warning(
          `Changed role for ${result.summary.succeeded} users, ${result.summary.failed} failed`
        )
      }
      setShowBulkRoleModal(false)
      setSelectedUsers(new Set())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk role change failed')
    } finally {
      setIsBulkLoading(false)
    }
  }

  // Selection info for the bulk action toolbar
  const selectableUsers = useMemo(() => {
    if (!filteredUsers) return []
    return filteredUsers.filter((u) => u._id !== currentUser?._id && u.role !== 'superadmin')
  }, [filteredUsers, currentUser?._id])

  const isAllSelected = selectableUsers.length > 0 && selectedUsers.size === selectableUsers.length
  const isPartiallySelected = selectedUsers.size > 0 && !isAllSelected

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const adminCount = userCounts?.admins || admins?.length || 0
  const totalCount = userCounts?.total || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage users, admins, and account statuses</p>
        </div>
        {isSuperadmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-amber-500 text-white font-medium text-sm',
              'hover:bg-amber-600 transition-colors cursor-pointer'
            )}
          >
            <UserPlus size={18} weight="bold" />
            Add Admin
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-blue-500/10">
            <Users size={24} weight="duotone" className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-amber-500/10">
            <ShieldCheck size={24} weight="duotone" className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{adminCount}</p>
            <p className="text-sm text-muted-foreground">Admins</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-red-500/10">
            <Warning size={24} weight="duotone" className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{statusCounts.suspended || 0}</p>
            <p className="text-sm text-muted-foreground">Suspended</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {roleFilters.map((filter) => {
            const isActive = roleFilter === filter.value
            return (
              <button
                key={filter.value}
                onClick={() => handleFilterChange('role', filter.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((filter) => {
            const count = filter.value === 'all' ? totalCount : statusCounts[filter.value] || 0
            const config = filter.value !== 'all' ? statusConfig[filter.value] : null
            const isActive = statusFilter === filter.value

            return (
              <TooltipProvider key={filter.value} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleFilterChange('status', filter.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                        isActive
                          ? filter.value === 'suspended'
                            ? 'bg-red-500 text-white shadow-sm'
                            : 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <span>{filter.label}</span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-semibold min-w-[1.25rem] text-center',
                          isActive ? 'bg-white/20 text-inherit' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  </TooltipTrigger>
                  {config && (
                    <TooltipContent side="bottom">
                      <p>{config.description}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
            >
              <XCircle size={20} className="text-muted-foreground" />
            </button>
            <span className="text-sm font-medium">
              {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActionReason('')
                setShowBulkSuspendModal(true)
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                'bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors cursor-pointer'
              )}
            >
              <XCircle size={16} weight="bold" />
              Suspend
            </button>
            <button
              onClick={() => setShowBulkUnsuspendModal(true)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                'bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors cursor-pointer'
              )}
            >
              <CheckCircle size={16} weight="bold" />
              Unsuspend
            </button>
            {isSuperadmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                      'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors cursor-pointer'
                    )}
                  >
                    <ShieldCheck size={16} weight="bold" />
                    Change Role
                    <CaretDown size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkRoleTarget('admin')
                      setShowBulkRoleModal(true)
                    }}
                  >
                    <Crown size={16} className="mr-2 text-amber-600" />
                    Make Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkRoleTarget('organizer')
                      setShowBulkRoleModal(true)
                    }}
                  >
                    <UserCircle size={16} className="mr-2 text-blue-600" />
                    Make Organizer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Select All Header */}
      {filteredUsers && filteredUsers.length > 0 && (
        <div className="flex items-center gap-3 px-2">
          <button
            onClick={toggleSelectAll}
            className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
            title={isAllSelected ? 'Deselect all' : 'Select all'}
          >
            {isAllSelected ? (
              <CheckSquare size={20} weight="fill" className="text-primary" />
            ) : isPartiallySelected ? (
              <MinusSquare size={20} weight="fill" className="text-primary" />
            ) : (
              <Square size={20} className="text-muted-foreground" />
            )}
          </button>
          <span className="text-sm text-muted-foreground">
            {isAllSelected
              ? 'All selectable users selected'
              : isPartiallySelected
                ? `${selectedUsers.size} selected`
                : 'Select all'}
          </span>
        </div>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {!usersResult ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredUsers?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Users size={64} weight="duotone" className="mx-auto text-muted-foreground/30 mb-6" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? `No users match "${searchQuery}"` : 'No users in this category'}
            </p>
          </div>
        ) : (
          filteredUsers?.map((user) => {
            const status = statusConfig[user.status as UserStatus] || statusConfig.active
            const role = roleConfig[user.role as UserRole] || roleConfig.organizer
            const RoleIcon = role.icon
            const isCurrentUser = user._id === currentUser?._id
            const canModerate =
              !isCurrentUser &&
              user.role !== 'superadmin' &&
              (isSuperadmin || user.role !== 'admin')

            const isSelected = selectedUsers.has(user._id)
            const canSelect = !isCurrentUser && user.role !== 'superadmin'

            return (
              <div
                key={user._id}
                className={cn(
                  'rounded-xl border bg-card p-5 transition-colors group',
                  isSelected
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-primary/20 hover:bg-muted/30'
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Selection Checkbox */}
                    {canSelect && (
                      <button
                        onClick={() => toggleUserSelection(user._id)}
                        className="p-1 hover:bg-muted rounded transition-colors cursor-pointer flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare size={20} weight="fill" className="text-primary" />
                        ) : (
                          <Square size={20} className="text-muted-foreground" />
                        )}
                      </button>
                    )}
                    {!canSelect && <div className="w-[28px]" />}

                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-primary">
                        {(user.name || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{user.name || 'Unnamed'}</h3>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Joined {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Role Badge */}
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full capitalize',
                              role.bg,
                              role.text
                            )}
                          >
                            <RoleIcon size={14} weight="duotone" />
                            {user.role || 'organizer'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{role.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Status Badge */}
                    <span
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-full',
                        status.bg,
                        status.text
                      )}
                    >
                      {status.label}
                    </span>

                    {/* Actions Dropdown */}
                    {canModerate && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer">
                            <DotsThree size={20} weight="bold" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {user.status === 'suspended' ? (
                            <DropdownMenuItem
                              onClick={() => openUnsuspendModal(user._id, user.name || 'this user')}
                              className="text-green-600 focus:text-green-600"
                            >
                              <CheckCircle size={16} weight="duotone" className="mr-2" />
                              Unsuspend User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => openSuspendModal(user._id, user.name || 'this user')}
                              className="text-red-600 focus:text-red-600"
                            >
                              <XCircle size={16} weight="duotone" className="mr-2" />
                              Suspend User
                            </DropdownMenuItem>
                          )}

                          {isSuperadmin && user.role === 'admin' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  openRemoveAdminModal(user._id, user.name || 'this user')
                                }
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash size={16} weight="duotone" className="mr-2" />
                                Remove Admin Role
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Suspension Reason */}
                {user.status === 'suspended' && user.suspendedReason && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-red-600">
                      <span className="font-medium">Reason:</span> {user.suspendedReason}
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Load More Button */}
        {usersResult?.hasMore && (
          <div className="flex justify-center pt-4">
            <button
              onClick={handleLoadMore}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-lg',
                'border border-border bg-card text-sm font-medium',
                'hover:bg-muted transition-colors cursor-pointer'
              )}
            >
              <CaretDown size={16} weight="bold" />
              Load More
              {usersResult.totalCount && (
                <span className="text-muted-foreground">
                  ({filteredUsers.length} of {usersResult.totalCount})
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <UserPlus size={20} weight="duotone" className="text-amber-600" />
              </div>
              <DialogTitle>Add New Admin</DialogTitle>
            </div>
            <DialogDescription>
              Create a new admin account or upgrade an existing user to admin role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                type="text"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Enter admin's full name"
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg border border-border bg-background',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <EnvelopeSimple
                  size={18}
                  weight="duotone"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                If the user exists, they will be upgraded to admin.
              </p>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAdmin}
              disabled={!newAdminName.trim() || !newAdminEmail.trim()}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-amber-500 text-white hover:bg-amber-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Create Admin
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Modal */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Trash size={20} weight="duotone" className="text-red-600" />
              </div>
              <DialogTitle>Remove Admin Role</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to remove admin privileges from{' '}
              <strong>{selectedUserName}</strong>? They will be downgraded to organizer role.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={3}
            className={cn(
              'w-full px-3 py-2 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />

          <DialogFooter>
            <button
              onClick={() => setShowRemoveModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRemoveAdmin}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Remove Admin
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Modal */}
      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle size={20} weight="duotone" className="text-red-600" />
              </div>
              <DialogTitle>Suspend User</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to suspend <strong>{selectedUserName}</strong>? They will not be
              able to access the platform.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Reason for suspension (required)"
            rows={3}
            className={cn(
              'w-full px-3 py-2 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />

          <DialogFooter>
            <button
              onClick={() => setShowSuspendModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSuspendUser}
              disabled={!actionReason.trim()}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-red-500 text-white hover:bg-red-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Suspend User
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsuspend User Modal */}
      <Dialog open={showUnsuspendModal} onOpenChange={setShowUnsuspendModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle size={20} weight="duotone" className="text-green-600" />
              </div>
              <DialogTitle>Unsuspend User</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to unsuspend <strong>{selectedUserName}</strong>? They will
              regain access to the platform.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={3}
            className={cn(
              'w-full px-3 py-2 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />

          <DialogFooter>
            <button
              onClick={() => setShowUnsuspendModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUnsuspendUser}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              Unsuspend User
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Suspend Modal */}
      <Dialog open={showBulkSuspendModal} onOpenChange={setShowBulkSuspendModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle size={20} weight="duotone" className="text-red-600" />
              </div>
              <DialogTitle>Bulk Suspend Users</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to suspend <strong>{selectedUsers.size} users</strong>? They
              will not be able to access the platform.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Reason for suspension (required)"
            rows={3}
            className={cn(
              'w-full px-3 py-2 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />

          <DialogFooter>
            <button
              onClick={() => setShowBulkSuspendModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkSuspend}
              disabled={!actionReason.trim() || isBulkLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium cursor-pointer',
                'bg-red-500 text-white hover:bg-red-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isBulkLoading ? 'Suspending...' : `Suspend ${selectedUsers.size} Users`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Unsuspend Modal */}
      <Dialog open={showBulkUnsuspendModal} onOpenChange={setShowBulkUnsuspendModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle size={20} weight="duotone" className="text-green-600" />
              </div>
              <DialogTitle>Bulk Unsuspend Users</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to unsuspend <strong>{selectedUsers.size} users</strong>? They
              will regain access to the platform.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              onClick={() => setShowBulkUnsuspendModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUnsuspend}
              disabled={isBulkLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium cursor-pointer',
                'bg-green-500 text-white hover:bg-green-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isBulkLoading ? 'Unsuspending...' : `Unsuspend ${selectedUsers.size} Users`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Role Change Modal */}
      <Dialog open={showBulkRoleModal} onOpenChange={setShowBulkRoleModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ShieldCheck size={20} weight="duotone" className="text-amber-600" />
              </div>
              <DialogTitle>Bulk Change Role</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to change the role of{' '}
              <strong>{selectedUsers.size} users</strong> to{' '}
              <strong className="capitalize">{bulkRoleTarget}</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              onClick={() => setShowBulkRoleModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkRoleChange}
              disabled={isBulkLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium cursor-pointer',
                'bg-amber-500 text-white hover:bg-amber-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isBulkLoading
                ? 'Changing...'
                : `Change ${selectedUsers.size} Users to ${bulkRoleTarget}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
